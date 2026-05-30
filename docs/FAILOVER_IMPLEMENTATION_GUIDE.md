# Backend Failover: Implementation Guide

This document provides step-by-step instructions and code templates to implement safe backend failover.

---

## Phase 1: Frontend Failover Service (4 hours)

### Step 1.1: Create BackendFailover Class

**File: `src/services/backendFailover.js`**

```javascript
// Standalone failover manager — no axios dependency
class BackendFailover {
  constructor(primaryUrl, fallbackUrl) {
    this.primaryUrl = primaryUrl;
    this.fallbackUrl = fallbackUrl;
    this.currentUrl = primaryUrl;
    this.failureCount = 0;
    this.lastPrimaryCheckTime = 0;
    this.primaryCheckInterval = 30000; // 30 seconds
  }

  getCurrentUrl() {
    return this.currentUrl;
  }

  async recordFailure() {
    this.failureCount++;
    console.log(`[Failover] Failure count: ${this.failureCount}`);

    if (this.failureCount >= 3) {
      await this.attemptFailover();
    }
  }

  async attemptFailover() {
    if (this.currentUrl === this.fallbackUrl) {
      console.warn("[Failover] Already on fallback, cannot failover further");
      return;
    }

    const fallback = this.fallbackUrl;
    console.log(`[Failover] Attempting to switch to ${fallback}`);

    const isHealthy = await this.checkHealth(fallback);
    if (isHealthy) {
      this.currentUrl = fallback;
      this.failureCount = 0;
      console.log(`[Failover] Successfully switched to fallback`);
    } else {
      console.warn(`[Failover] Fallback is not healthy, staying on current`);
    }
  }

  async checkHealth(backendUrl) {
    try {
      const healthUrl = `${backendUrl}/ping`;
      console.log(`[Health] Checking ${healthUrl}`);

      const response = await fetch(healthUrl, {
        method: "GET",
        timeout: 5000,
      });

      const isHealthy = response.ok;
      console.log(
        `[Health] ${backendUrl} is ${isHealthy ? "healthy" : "unhealthy"}`,
      );
      return isHealthy;
    } catch (error) {
      console.warn(`[Health] Error checking ${backendUrl}:`, error.message);
      return false;
    }
  }

  async startPrimaryRecoveryCheck() {
    setInterval(async () => {
      // Only check primary if we're currently on fallback
      if (this.currentUrl !== this.fallbackUrl) {
        return;
      }

      const timeSinceLastCheck = Date.now() - this.lastPrimaryCheckTime;
      if (timeSinceLastCheck < this.primaryCheckInterval) {
        return;
      }

      console.log("[Failover] Checking if primary has recovered...");
      const isPrimaryHealthy = await this.checkHealth(this.primaryUrl);

      if (isPrimaryHealthy) {
        console.log("[Failover] Primary has recovered! Switching back...");
        this.currentUrl = this.primaryUrl;
        this.failureCount = 0;
      }

      this.lastPrimaryCheckTime = Date.now();
    }, 10000); // Check every 10 seconds (but skip if interval not elapsed)
  }
}

export default BackendFailover;
```

### Step 1.2: Integrate Failover with Axios

**File: `src/services/api.js` (modify existing)**

Replace the entire file with:

```javascript
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_TOKEN_KEY } from "../constants/storage";
import BackendFailover from "./backendFailover";

const PRIMARY_API_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
const FALLBACK_API_URL =
  process.env.EXPO_PUBLIC_FALLBACK_API_URL || "http://localhost:3001/api";

// Initialize failover manager
export const failover = new BackendFailover(PRIMARY_API_URL, FALLBACK_API_URL);

// Create axios instance
const api = axios.create({
  baseURL: PRIMARY_API_URL,
  timeout: 15000,
});

// Registered by App.js on mount via registerLogoutCallback()
let _logoutCallback = null;
let _isHandlingExpiry = false;
let _cachedToken = null;

export function registerLogoutCallback(fn) {
  _logoutCallback = fn;
}

export function setCachedToken(token) {
  _cachedToken = token;
}

export function clearCachedToken() {
  _cachedToken = null;
}

// ─ Request interceptor: Inject token + Idempotency-Key ────────────────────
api.interceptors.request.use(async (config) => {
  // Update baseURL from failover manager on every request
  config.baseURL = failover.getCurrentUrl();

  // Inject token
  if (_cachedToken === null) {
    _cachedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }
  if (_cachedToken) {
    config.headers.Authorization = `Bearer ${_cachedToken}`;
  }

  // Inject Idempotency-Key for write operations
  if (
    ["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())
  ) {
    const idempotencyKey = await getIdempotencyKey(config.method, config.url);
    config.headers["Idempotency-Key"] = idempotencyKey;
  }

  return config;
});

// ─ Response interceptor: Handle auth errors + failover ────────────────────
api.interceptors.response.use(
  (response) => {
    // Success: reset failure count
    failover.failureCount = 0;
    return response;
  },
  async (error) => {
    // Handle 401 (token expired)
    if (error.response?.status === 401 && !_isHandlingExpiry) {
      _isHandlingExpiry = true;
      _cachedToken = null;
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      if (_logoutCallback) {
        _logoutCallback();
      }
      setTimeout(() => {
        _isHandlingExpiry = false;
      }, 3000);
      return Promise.reject(error);
    }

    // Handle 5xx or timeout: trigger failover
    if (
      !error.response ||
      error.response.status >= 500 ||
      error.code === "ECONNABORTED"
    ) {
      console.warn(
        `[API] Request failed (${error.response?.status || error.code}). Checking failover...`,
      );
      await failover.recordFailure();

      // If we switched backends, retry once
      if (failover.getCurrentUrl() !== error.config.baseURL) {
        console.log("[API] Backend changed, retrying request...");
        try {
          const retryConfig = { ...error.config };
          retryConfig.baseURL = failover.getCurrentUrl();
          return await api.request(retryConfig);
        } catch (retryError) {
          console.warn("[API] Retry failed, giving up");
          return Promise.reject(retryError);
        }
      }
    }

    return Promise.reject(error);
  },
);

// ─ Idempotency Key Management ───────────────────────────────────────────────
async function getIdempotencyKey(method, url) {
  // For idempotent ops, always use a stable key (device + operation combo)
  // For safe retry behavior
  const cacheKey = `idempotency_${method}_${url}`;
  let key = await AsyncStorage.getItem(cacheKey);

  if (!key) {
    key = generateUUID();
    await AsyncStorage.setItem(cacheKey, key);
  }

  return key;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Start health checks when module loads
failover.startPrimaryRecoveryCheck();

export default api;
```

### Step 1.3: Configure Environment Variables

**File: `.env` (React Native Expo)**

```bash
# Primary backend (Render)
EXPO_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com/api

# Fallback backend (Fly.io)
EXPO_PUBLIC_FALLBACK_API_URL=https://your-fly-backend.fly.dev/api
```

**Verify:**

```bash
cd to-do-app-frontend
npm start
# Check console: [Failover] Health check intervals should start logging
```

---

## Phase 2: Backend Health Check (1 hour)

### Step 2.1: Add Health Endpoint with Database Check

**File: `routes/health.js` (new file)**

```javascript
const express = require("express");
const Prisma = require("../prismaClient.js");
const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    // Test database connectivity
    await Prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        memory:
          Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      },
    });
  } catch (error) {
    console.error("[Health] Database check failed:", error.message);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "error: " + error.message,
      },
    });
  }
});

module.exports = router;
```

### Step 2.2: Mount Health Route

**File: `index.js` (modify)**

Add near the top where other routes are mounted:

```javascript
const health = require("./routes/health.js");
app.use("/api", health);

// Also add a health check at root for simplicity
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});
```

**Test:**

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Test health endpoint
curl http://localhost:3000/health
# Expected: { "status": "healthy", ... }

# Test database connectivity
curl http://localhost:3000/api/health
# Expected: { "status": "healthy", checks: { database: "ok", ... } }
```

---

## Phase 3: Idempotency Protection (3 hours)

### Step 3.1: Add Idempotency Key Table

**File: `prisma/migrations/[timestamp]_add_idempotent_requests/migration.sql`**

```sql
-- CreateTable
CREATE TABLE "idempotent_requests" (
    "id" SERIAL NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "response_body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotent_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique on idempotency_key)
CREATE UNIQUE INDEX "idempotent_requests_idempotency_key_key" ON "idempotent_requests"("idempotency_key");

-- CreateIndex (on created_at for cleanup)
CREATE INDEX "idempotent_requests_created_at_idx" ON "idempotent_requests"("created_at");
```

**Apply migration:**

```bash
npx prisma migrate dev --name add_idempotent_requests
npx prisma generate
```

### Step 3.2: Add Idempotency Middleware

**File: `middleware/idempotency.js`**

```javascript
const Prisma = require("../prismaClient.js");

async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers["idempotency-key"];
  const method = req.method;

  // Only cache write operations
  const isWriteOperation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!idempotencyKey || !isWriteOperation) {
    return next();
  }

  try {
    // Check if request was already processed
    const existingRequest = await Prisma.idempotent_requests.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existingRequest) {
      console.log(`[Idempotency] Cache hit for key: ${idempotencyKey}`);
      return res
        .status(existingRequest.status)
        .json(JSON.parse(existingRequest.response_body));
    }

    // Capture response
    const originalJson = res.json.bind(res);
    let responseData = null;
    let responseStatus = 200;

    res.json = function (data) {
      responseData = data;
      responseStatus = res.statusCode;

      // Store in cache asynchronously (don't wait)
      Prisma.idempotent_requests
        .create({
          data: {
            idempotency_key: idempotencyKey,
            method: method,
            path: req.path,
            status: responseStatus,
            response_body: JSON.stringify(data),
          },
        })
        .catch((err) => {
          console.error("[Idempotency] Failed to cache response:", err.message);
        });

      return originalJson(data);
    };

    next();
  } catch (error) {
    console.error("[Idempotency] Middleware error:", error.message);
    next();
  }
}

module.exports = idempotencyMiddleware;
```

### Step 3.3: Mount Idempotency Middleware

**File: `index.js` (modify)**

Add early in middleware chain:

```javascript
const idempotencyMiddleware = require("./middleware/idempotency.js");

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(idempotencyMiddleware); // ← Add here, before routes
```

**Test Idempotency:**

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Make write request with Idempotency-Key
IDEMPOTENCY_KEY="test-key-123"
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"title":"Test task","description":"Test"}'

# Response 1: Creates task, returns 201/200
# Expected: { "id": 1, "title": "Test task", ... }

# Make exact same request again
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"title":"Test task","description":"Test"}'

# Response 2: Returns cached response, no duplicate created
# Expected: SAME RESPONSE as before (not duplicated)

# Verify only one task exists
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should show only 1 task, not 2
```

### Step 3.4: Add Idempotency Cleanup Job

**File: `jobs/cleanupIdempotency.js`**

```javascript
const Prisma = require("../prismaClient.js");

async function cleanupIdempotencyCache() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const deleted = await Prisma.idempotent_requests.deleteMany({
      where: {
        created_at: {
          lt: oneDayAgo,
        },
      },
    });

    console.log(`[Cleanup] Deleted ${deleted.count} old idempotency records`);
  } catch (error) {
    console.error("[Cleanup] Error deleting old records:", error.message);
  }
}

// Run cleanup every 6 hours
setInterval(cleanupIdempotencyCache, 6 * 60 * 60 * 1000);

module.exports = cleanupIdempotencyCache;
```

Add to `index.js`:

```javascript
require("./jobs/cleanupIdempotency.js");
```

---

## Phase 4: Redis Rate Limiting (2 hours)

### Step 4.1: Install Redis Dependencies

```bash
npm install redis rate-limit-redis
```

### Step 4.2: Update Rate Limiting in auth.js

**File: `routes/auth.js` (modify at top)**

```javascript
const express = require("express");
const Prisma = require("../prismaClient.js");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const authMiddleware = require("../middleware/auth.js");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const { Resend } = require("resend");
const redis = require("redis");
const RedisStore = require("rate-limit-redis");

// ─ Initialize Redis (shared across both backends) ──────────────────────────
let redisClient = null;
let redisConnected = false;

async function initRedis() {
  if (redisConnected) return;

  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      console.warn("[Redis] Connection error:", err.message);
      console.warn("[Redis] Falling back to in-memory rate limiting");
      redisConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected successfully");
      redisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.warn("[Redis] Failed to connect:", error.message);
    console.warn("[Redis] Falling back to in-memory rate limiting");
    redisConnected = false;
  }
}

// Initialize Redis on module load
initRedis();

// ─ Create rate limiters ──────────────────────────────────────────────────
function createLimiter(max) {
  const limiterConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: max,
    message: { message: "Too many attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => false, // Don't skip any requests
  };

  // Use Redis store if connected, otherwise in-memory
  if (redisConnected && redisClient) {
    limiterConfig.store = new RedisStore({
      client: redisClient,
      prefix: "rate-limit:",
    });
  }

  return rateLimit(limiterConfig);
}

const loginLimiter = createLimiter(15);
const registerLimiter = createLimiter(15);
const passwordResetLimiter = createLimiter(5); // Stricter for password reset

// ─ Rest of auth routes ───────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ... rest of the auth routes unchanged ...
```

### Step 4.3: Setup Redis on Render & Fly.io

**For Render:**

```bash
# Go to your Render dashboard
# Resources tab → Add → Redis
# Copy the connection URL
# Set environment variable: REDIS_URL=redis://...
```

**For Fly.io:**

```bash
# Create a separate Redis app
fly app create todo-app-redis
fly launch redis

# Create a secret with the connection URL
fly secrets set REDIS_URL=redis://...
```

**Test Redis connection:**

```bash
# Add test endpoint (temporary)
app.get('/test-redis', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'Redis connected' });
  } catch (error) {
    res.json({ status: 'Redis disconnected', error: error.message });
  }
});

# Then curl it
curl http://localhost:3000/test-redis
```

---

## Phase 5: Environment Variables & Secrets (1 hour)

### Step 5.1: Verify JWT_SECRET is Shared

**On Render:**

```bash
# Go to dashboard → Settings → Environment Variables
# Ensure JWT_SECRET is set
echo $JWT_SECRET
```

**On Fly.io:**

```bash
# Set the SAME JWT_SECRET
fly secrets set JWT_SECRET="your-secret-value"
fly secrets list
```

### Step 5.2: Sync All Critical Secrets

Secrets that must be identical on both backends:

- `JWT_SECRET`
- `RESEND_API_KEY` (same email sender)
- `DATABASE_URL` (same Supabase instance)
- `DIRECT_URL` (same Supabase instance)
- `REDIS_URL` (same Redis instance)

Verify on both:

```bash
# Render
env | grep -E "JWT_SECRET|RESEND|DATABASE|REDIS"

# Fly.io
fly ssh console
env | grep -E "JWT_SECRET|RESEND|DATABASE|REDIS"
```

---

## Phase 6: Testing & Validation (3 hours)

### Step 6.1: Local Failover Test

```bash
# Terminal 1: Start Render backend
cd to-do-app-backend-node
npm run dev  # Runs on port 3000

# Terminal 2: Start Fly backend (different port)
cd to-do-app-backend-node
PORT=3001 npm run dev

# Terminal 3: Configure frontend with both URLs
# Edit .env:
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_FALLBACK_API_URL=http://localhost:3001/api

# Terminal 4: Start frontend
cd to-do-app-frontend
npm start

# Terminal 5: Monitor logs
npm start -- --log-level debug

# Test 1: Make normal request
# Expected: Works on port 3000

# Test 2: Kill port 3000
kill -9 <PID of node on 3000>

# Expected in logs:
# [Failover] Failure count: 1
# [Failover] Failure count: 2
# [Failover] Failure count: 3
# [Failover] Attempting to switch to http://localhost:3001/api
# [Failover] Successfully switched to fallback

# Test 3: Make request again
# Expected: Works on port 3001 with retry

# Test 4: Restart port 3000
npm run dev

# Expected: After ~30 seconds, failover switches back to port 3000
```

### Step 6.2: Idempotency Test

```bash
# Get a valid token first
TOKEN=$(curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' \
  | jq -r '.token')

# Make request with Idempotency-Key
IDEMPOTENCY_KEY="idempotent-test-$(date +%s)"
RESPONSE=$(curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"title":"Test task","description":"Test","priority":"medium"}')

echo "Response 1: $RESPONSE"
TASK_ID=$(echo $RESPONSE | jq '.id')

# Retry with same Idempotency-Key
RESPONSE2=$(curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"title":"Test task","description":"Test","priority":"medium"}')

echo "Response 2: $RESPONSE2"

# Verify both responses are identical
if [ "$RESPONSE" = "$RESPONSE2" ]; then
  echo "✓ Idempotency working: responses are identical"
else
  echo "✗ Idempotency NOT working: responses differ"
fi

# Verify only 1 task was created
TASK_COUNT=$(curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.tasks | length')

if [ "$TASK_COUNT" = "1" ]; then
  echo "✓ No duplicate created"
else
  echo "✗ Duplicate created (count: $TASK_COUNT)"
fi
```

### Step 6.3: Rate Limiting Test

```bash
# Test: Hit rate limit on primary, verify it carries over to fallback

TOKEN=$(curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' \
  | jq -r '.token')

# Make 15 requests to login endpoint (rate limit: 15/15min)
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpassword"}' > /dev/null 2>&1
  echo "Request $i"
done

# 16th request should be rate-limited on port 3000
RESPONSE=$(curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpassword"}')

echo "Response on primary: $RESPONSE"
# Expected: HTTP 429 or rate limit error

# Now check if failover respects the same rate limit
RESPONSE2=$(curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpassword"}')

echo "Response on fallback: $RESPONSE2"
# Expected (with Redis): Also rate-limited (same bucket)
# Expected (without Redis): Not rate-limited (different bucket) ← This is the risk!
```

---

## Phase 7: Deployment & Monitoring (2 hours)

### Step 7.1: Deploy to Render

```bash
cd to-do-app-backend-node
git add .
git commit -m "Add failover support: health checks, idempotency, Redis rate limiting"
git push origin main

# Render auto-deploys
# Verify in Render dashboard → Deployments
```

### Step 7.2: Deploy to Fly.io

```bash
cd to-do-app-backend-node
fly deploy

# Verify deployment
fly logs
```

### Step 7.3: Deploy Frontend

```bash
cd to-do-app-frontend
# Update .env with production URLs
EXPO_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com/api
EXPO_PUBLIC_FALLBACK_API_URL=https://your-fly-backend.fly.dev/api

eas build --platform ios --auto-submit
eas build --platform android --auto-submit
```

### Step 7.4: Setup Monitoring

**Render Alerts:**

```
Dashboard → Monitoring → Alerts
- Trigger: Error rate > 5% in 5 minutes
- Trigger: Response time > 5s for 5 minutes
- Action: Slack/email notification
```

**Fly.io Alerts:**

```
Dashboard → Monitoring
- CPU > 80%
- Memory > 80%
- Response time > 5s
```

**Datadog / New Relic (optional):**

```javascript
// Add to index.js
const newrelic = require("newrelic");
// or
const dd = require("dd-trace");
```

### Step 7.5: Health Checks in Render & Fly.io

**Render:**

```toml
# render.yaml
services:
  - name: api
    healthCheck:
      path: /health
      interval: 30
      timeout: 10
      startFailureThreshold: 5
```

**Fly.io:**

```toml
# fly.toml
[http_service]
  processes = ["app"]

[[http_service.checks]]
  grace_period = "30s"
  interval = "30s"
  timeout = "5s"
  method = "GET"
  path = "/health"
```

---

## Phase 8: Runbook & Incident Response (1 hour)

Create this file: `docs/FAILOVER_RUNBOOK.md`

````markdown
# Failover Incidents: Response Guide

## Scenario 1: Render is down

**Detection:**

- Render dashboard shows 5xx errors
- Datadog/New Relic alert triggers
- User reports app hanging

**Response:**

1. Confirm Render is actually down: `curl https://your-render-backend.com/health`
2. Check Fly.io health: `curl https://your-fly-backend.fly.dev/health`
3. If both are down:
   - Check Supabase status: https://status.supabase.com
   - Check Fly.io status: https://status.flyio.dev
4. Monitor frontend logs: Users should auto-failover within 15 seconds
5. No manual intervention needed; frontend handles automatically

**Recovery:**

- Render restarts automatically (or manually restart)
- Frontend detects recovery within 30 seconds
- Automatic switch back to primary

## Scenario 2: Rate limits being bypassed

**Detection:**

- Login/password reset endpoints being abused
- Security alert from failed login monitors

**Response:**

1. Check Redis connection: `fly redis console` → `PING`
2. If Redis is down:
   - Fly.io will fallback to in-memory rate limiting
   - Rate limits are NOT shared across backends anymore ⚠️
   - Manually block IP addresses in Render/Fly.io firewall
3. If Redis is up but being bypassed:
   - Check Redis has correct rate-limit keys: `KEYS rate-limit:*`
   - Verify both backends use same REDIS_URL

**Manual reset (if needed):**

```bash
# Connect to Redis
fly redis console

# Delete all rate limit entries
FLUSHDB

# Or specific entries
DEL rate-limit:*

# Restart backends
fly apps restart
```
````

## Scenario 3: Duplicate writes detected

**Detection:**

- Users report duplicate tasks being created
- Database shows duplicate entries with identical data
- Same Idempotency-Key appears multiple times in logs

**Response:**

1. Check idempotency table: `SELECT * FROM idempotent_requests WHERE created_at > NOW() - INTERVAL '1 hour';`
2. If duplicates exist:
   - Identify the duplicate task IDs in database
   - Manually delete or merge duplicates
   - Update frontend to refresh cache
3. Verify Idempotency-Key header is being sent:
   - Frontend logs should show `[API] Idempotency-Key: ...`
   - Backend logs should show `[Idempotency] Cache hit for key: ...`

**Prevention:**

- Ensure frontend is running latest version (with idempotency support)
- Ensure both backends have idempotency middleware enabled

## Scenario 4: JWT_SECRET mismatch

**Detection:**

- Failover to Fly.io → 401 errors
- Users get logged out after switch
- Logs show "Invalid token" errors

**Response:**

1. Check JWT_SECRET on both backends:

   ```bash
   # Render
   heroku config:get JWT_SECRET -a your-app-name

   # Fly.io
   fly secrets list
   ```

2. If they differ:
   - Update JWT_SECRET on Fly.io to match Render
   - Restart Fly.io: `fly apps restart`
   - Users will need to re-login

**Prevention:**

- Use a secrets vault (AWS Secrets Manager, Doppler)
- Never copy-paste secrets manually
- Document secret sync process in team wiki

## Scenario 5: Supabase database down

**Detection:**

- Both backends return 503
- Database connection errors in logs
- Supabase status page shows outage

**Response:**

1. Check Supabase status: https://status.supabase.com
2. If outage is confirmed:
   - Wait for Supabase to recover (typically 30-60 min)
   - No manual action needed
   - Frontend will retry automatically
3. If not a Supabase outage:
   - Check connection pool exhaustion: `SELECT count(*) FROM pg_stat_activity;`
   - Check for slow queries: Check Supabase monitoring dashboard
   - Check firewall rules: Ensure both backends can reach Supabase

**Manual recovery:**

```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE duration > interval '5 minutes';

-- Restart connection pool
-- (Supabase dashboard → Settings → Database → Restart)
```

## Monitoring Checklist

Daily:

- [ ] Check Render uptime: https://dashboard.render.com
- [ ] Check Fly.io uptime: https://fly.io/dashboard
- [ ] Check Supabase uptime: https://status.supabase.com
- [ ] Review error logs for any 5xx spikes

Weekly:

- [ ] Test failover manually (if traffic is low)
- [ ] Review Datadog/New Relic metrics for anomalies
- [ ] Check Redis memory usage
- [ ] Check idempotency table size (should stay small with cleanup job)

Monthly:

- [ ] Full failover test: Kill primary backend, verify fallback works
- [ ] Verify JWT_SECRET is still in sync
- [ ] Review rate limit abuse patterns
- [ ] Test recovery (switch back to primary)

```

---

## Implementation Summary

| Phase | Component | Time | Status |
|-------|-----------|------|--------|
| 1 | Frontend Failover Service | 4h | Implement |
| 2 | Backend Health Check | 1h | Implement |
| 3 | Idempotency Protection | 3h | Implement |
| 4 | Redis Rate Limiting | 2h | Implement |
| 5 | Secrets Management | 1h | Verify |
| 6 | Testing & Validation | 3h | Test |
| 7 | Deployment & Monitoring | 2h | Deploy |
| 8 | Runbook & Documentation | 1h | Document |
| **Total** | | **17 hours** | |

---

## Deployment Checklist

Before going live:

- [ ] All environment variables set on both backends (JWT_SECRET, REDIS_URL, etc.)
- [ ] Health endpoint responds correctly on both backends
- [ ] Idempotency table created and cleanup job running
- [ ] Redis instance provisioned and connected
- [ ] Rate limiting tested across both backends
- [ ] Frontend failover logic integrated and tested locally
- [ ] Monitoring/alerting set up on both backends
- [ ] Runbook shared with team
- [ ] Rollback plan documented (how to disable failover if needed)

---

```
