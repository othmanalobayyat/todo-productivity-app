# Backend Failover Analysis: Render ↔ Fly.io

**Assessment Date:** May 28, 2026  
**Status:** SAFE with careful implementation  
**Risk Level:** LOW–MEDIUM (manageable with recommended safeguards)

---

## Executive Summary

Your architecture **can** safely support automatic backend failover between Render and Fly.io. The shared Supabase PostgreSQL database, stateless JWT authentication, and Prisma ORM all work together to enable transparent failover. However, there are **7 critical considerations** that must be addressed:

| Aspect                    | Status             | Risk                              |
| ------------------------- | ------------------ | --------------------------------- |
| **Database Consistency**  | ✅ Safe            | None (Supabase handles isolation) |
| **JWT Token Portability** | ✅ Safe            | None (same JWT_SECRET on both)    |
| **Duplicate Writes**      | ⚠️ Manageable      | Low (with idempotency keys)       |
| **Rate Limiting**         | ⚠️ Requires Config | Medium (per-IP, not per-backend)  |
| **Session State**         | ✅ Stateless       | None (JWT + stateless endpoints)  |
| **Concurrent Requests**   | ✅ Safe            | None (DB-level constraints)       |
| **Prisma Connections**    | ✅ Safe            | Low (pool already shared)         |

---

## Part 1: Safety Analysis

### 1.1 Database Consistency — ✅ SAFE

**Why it's safe:**

- Supabase PostgreSQL enforces **ACID transactions** at the database level
- Both backends use the **same connection string** (DATABASE_URL pooler)
- Prisma manages connection pooling; clients are interchangeable
- No custom caching or replication logic to synchronize

**What Supabase handles:**

- Foreign key constraints prevent orphaned records
- Unique constraints prevent duplicate data
- Transactions ensure atomicity across operations
- Connection pooling prevents exhaustion

**Risks mitigated:**

- ✅ No race conditions between backends
- ✅ No stale reads (both connect to same DB)
- ✅ No split-brain writes
- ✅ No data corruption from concurrent writes to different tables

**Database connection limits:**
Supabase standard tier allows ~100 concurrent connections. Each Render + Fly.io instance uses 1 pool. Even during failover:

```
Render pool (idle):      ~10 connections
Fly.io pool (active):    ~10 connections
Total in-use:            ~20 (well under limit)
```

✅ **No issue during failover.**

---

### 1.2 JWT Authentication — ✅ SAFE

**Why it works:**
Your JWT tokens are **cryptographically signed** with `JWT_SECRET`. As long as both backends have **the same secret**, tokens are portable.

**Current configuration:**

```javascript
// Both Render and Fly.io have JWT_SECRET in environment
jwt.verify(token, process.env.JWT_SECRET);
```

**Token verification flow:**

1. Frontend stores token after login (either backend)
2. Token includes: `{ userId, iat, exp }`
3. Token signed with SHA-256 + HMAC(JWT_SECRET)
4. Token valid for **7 days** (long enough to handle multi-day downtime)
5. Either backend can verify/decode the token

**Risk: Secret mismatch**
⚠️ **CRITICAL:** If Render and Fly.io have different JWT_SECRET values:

- Tokens from Render will fail on Fly.io (401)
- Users will be logged out
- **SOLUTION:** Both must pull JWT_SECRET from the same **Supabase vault** or secure environment management system

**Current Vulnerability:** If Render and Fly.io envs are configured separately, they might have different secrets.  
**Recommended Fix:** Use Render's + Fly's shared environment variable service (e.g., Doppler, HashiCorp Vault, or AWS Secrets Manager).

---

### 1.3 Prisma ORM — ✅ SAFE

**Why Prisma works:**

Prisma is **fully stateless**. Each backend instance:

- Generates a fresh Prisma client on startup
- Connects to DATABASE_URL connection pooler
- Does NOT cache schema or metadata locally
- Can safely hot-swap to a different Prisma client

```javascript
// prismaClient.js
var Prisma = new PrismaClient(); // Fresh on each boot
module.exports = Prisma;
```

**During failover:**

1. Render backend sleeps → stops making queries
2. Fly.io backend wakes → starts making queries
3. Supabase connection pool re-assigns idle connections
4. Both can read/write safely

**Risks eliminated:**

- ✅ No stale Prisma schema metadata
- ✅ No migration conflicts (same migrations on both)
- ✅ No orm-level caching issues

**Important:** Both backends must have **run the same migrations**.  
Verify: `npx prisma migrate status` on both should show all migrations as "✓ Applied"

---

### 1.4 No Duplicate Writes (with safeguards) — ⚠️ MANAGEABLE

**The risk:**
If a write request is in-flight when Render sleeps:

```
Frontend → Render (timeout, no 200 response) → [Render sleeps]
Frontend doesn't know if write succeeded
Frontend retries to Fly.io
Fly.io processes the same write
Result: Duplicate task, duplicate subtask, etc.
```

**Current status:** Your app **has no idempotency protection**.  
**Impact:** Rare but possible on network/timeout failures.

**Scenarios that cause duplicates:**

1. ✅ User creates task → Render processes, response times out → Frontend retries on Fly.io → Duplicate
2. ✅ User edits task → Same scenario → Duplicate edit / conflicting state
3. ✅ User completes task → Duplicate completion record

**Real-world likelihood:**

- Low (network timeouts are rare in good conditions)
- Medium (if Render is degrading before full sleep)
- High (if Render is cold-starting after sleep)

**Recommended fix (see Part 3 for details):**
Add **Idempotency-Key header + database check** for all write operations.

---

### 1.5 Rate Limiting — ⚠️ POTENTIAL ISSUE

**Current rate limiting:**

```javascript
// Render IP: 35.x.x.x
// Fly.io IP: 66.x.x.x
var limiterOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 requests per window
};
var loginLimiter = rateLimit(limiterOptions);
```

**The problem:**
`express-rate-limit` by default uses `req.ip` as the key. During failover:

- If user is on Render, their rate-limit bucket is tracked by Render's IP
- If they fail over to Fly.io, Fly.io sees a **different IP** → **NEW rate-limit bucket**
- User can bypass rate limits by switching backends

```
Timeline:
Time 0:00  User logs in (attempt 1)           → Render
Time 0:05  Fails: invalid password (attempt 2) → Render
Time 0:10  Fails: invalid password (attempt 3) → Render
Time 0:15  Render sleeps
Time 0:20  User retries login (attempt 1)     → Fly.io [RATE LIMIT COUNTER RESETS!]
```

**Impact:**

- 🔴 **Password brute-force attacks become easier** during failover
- 🟡 Password reset endpoints are rate-limited stricter (5/15 min) → higher risk
- 🟡 Legitimate users could hit Render's limit, fail over to Fly.io, continue

**Recommended fix:**
Use **Redis-backed rate limiting** so both backends share the same rate-limit state:

```javascript
const RedisStore = require("rate-limit-redis");
const redis = require("redis");
const client = redis.createClient(process.env.REDIS_URL);

var limiterOptions = {
  store: new RedisStore({
    client: client,
    prefix: "rate-limit:",
  }),
  windowMs: 15 * 60 * 1000,
  max: 15,
};
```

**Alternative (simpler but less secure):**
Use client IP from the request body (not secure but consistent):

```javascript
const clientIp = req.body.clientIp || req.ip; // ⚠️ Client can spoof
```

**Best practice:** Redis is strongly recommended for production.

---

### 1.6 Session State — ✅ STATELESS

Your app is **fully stateless**:

- No server-side sessions stored
- No in-memory caches
- No WebSocket connections
- Pure JWT + REST

Each request is independent. Backend B can process requests from users who logged in on Backend A.

---

### 1.7 Concurrent Request Safety — ✅ SAFE

**Scenario: Simultaneous requests to both backends**

If a user has both Render and Fly.io in a failover chain:

```
User task = { title: "Buy groceries", completed: false }

Request 1: Render  PATCH /tasks/42 { completed: true }
Request 2: Fly.io  PATCH /tasks/42 { title: "Buy milk" }
```

**What happens:**

1. Render's update succeeds → DB has `{ completed: true, title: "Buy groceries" }`
2. Fly.io's update succeeds → DB has `{ completed: true, title: "Buy milk" }`

✅ **Both updates land safely** because Prisma + PostgreSQL handle concurrent writes.

⚠️ **Risk:** Last-write-wins semantics. If both write contradictory values, the last one sticks. This is acceptable for a to-do app (UI will refetch and reconcile).

---

## Part 2: Architecture Risks & Mitigations

### Risk Matrix

| Risk                                | Likelihood | Severity | Mitigation                   |
| ----------------------------------- | ---------- | -------- | ---------------------------- |
| Duplicate writes on timeout retry   | Medium     | High     | Idempotency keys (Part 3)    |
| Rate-limit bypass during failover   | Medium     | Medium   | Redis rate limiting (Part 3) |
| JWT_SECRET mismatch                 | Low        | Critical | Shared secrets vault         |
| Rate limit exhaustion on failover   | Low        | Low      | Implement backoff            |
| Database connection pool exhaustion | Low        | High     | Monitor connection count     |
| Prisma client instantiation errors  | Very Low   | Medium   | Health check endpoint        |

---

## Part 3: Production-Safe Failover Implementation

### 3.1 Frontend Failover Strategy

**Recommended approach: Sequential fallback with health checks**

```javascript
// src/services/backendFailover.js
const PRIMARY_BACKEND = "https://render-backend.com/api";
const FALLBACK_BACKEND = "https://fly.io-backend.com/api";
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const FAILOVER_THRESHOLD = 3; // Fail after 3 consecutive errors

class BackendFailover {
  constructor() {
    this.currentBackend = PRIMARY_BACKEND;
    this.failureCount = 0;
    this.isCheckingHealth = false;
    this.lastHealthCheckTime = Date.now();
  }

  async getHealthyBackend() {
    // Try current backend first
    if (await this.isHealthy(this.currentBackend)) {
      this.failureCount = 0;
      return this.currentBackend;
    }

    this.failureCount++;

    // If primary fails N times, try fallback
    if (this.failureCount >= FAILOVER_THRESHOLD) {
      const fallback =
        this.currentBackend === PRIMARY_BACKEND
          ? FALLBACK_BACKEND
          : PRIMARY_BACKEND;

      if (await this.isHealthy(fallback)) {
        console.log(`Switched to fallback: ${fallback}`);
        this.currentBackend = fallback;
        this.failureCount = 0;
        return fallback;
      }
    }

    // Both unhealthy, return current (will eventually fail the request)
    return this.currentBackend;
  }

  async isHealthy(backend) {
    try {
      const response = await fetch(`${backend}/ping`, {
        method: "GET",
        timeout: HEALTH_CHECK_TIMEOUT,
      });
      return response.ok;
    } catch (error) {
      console.warn(`Health check failed for ${backend}:`, error.message);
      return false;
    }
  }

  // Call this on every API request error
  onRequestError(error) {
    if (error.response?.status >= 500 || error.code === "ECONNABORTED") {
      this.getHealthyBackend(); // Trigger background failover check
    }
  }

  // Periodically re-check primary backend
  startHealthCheckLoop() {
    setInterval(async () => {
      if (this.currentBackend !== PRIMARY_BACKEND) {
        const isPrimaryHealthy = await this.isHealthy(PRIMARY_BACKEND);
        if (isPrimaryHealthy) {
          console.log("Primary backend recovered, switching back");
          this.currentBackend = PRIMARY_BACKEND;
          this.failureCount = 0;
        }
      }
    }, HEALTH_CHECK_INTERVAL);
  }
}

export const failover = new BackendFailover();
```

**Integration with Axios:**

```javascript
// src/services/api.js
import { failover } from "./backendFailover";

const api = axios.create({
  baseURL: failover.currentBackend,
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // On server error or timeout, check failover
    failover.onRequestError(error);

    // If we switched backends, retry the request once
    if (failover.currentBackend !== error.config.baseURL) {
      const retryConfig = { ...error.config };
      retryConfig.baseURL = failover.currentBackend;
      try {
        return await api.request(retryConfig);
      } catch (retryError) {
        // Second attempt failed, give up
        return Promise.reject(retryError);
      }
    }

    return Promise.reject(error);
  },
);

// Start health check loop on app startup
failover.startHealthCheckLoop();
```

**Timeout recommendation:**

- ✅ **5 seconds** for health checks (quick detection)
- ✅ **15 seconds** for regular API requests (current timeout is good)
- ✅ **Retry once on failover** (but not more to avoid cascading failures)

---

### 3.2 Health Check Endpoint (Already Present)

Your `/ping` endpoint exists and is good:

```javascript
app.get("/ping", function (req, res) {
  res.json({ message: "pong" });
});
```

**Recommendation: Enhance with database connectivity check**

```javascript
// routes/health.js
const express = require("express");
const Prisma = require("../prismaClient.js");
const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    // Test DB connection
    await Prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

module.exports = router;
```

Add to index.js:

```javascript
const health = require("./routes/health.js");
app.use("/api", health);
```

**Health check intervals:**

- Frontend checks every **30 seconds** (background)
- On error, frontend checks the primary backend every **30 seconds**
- Switches back when primary is healthy again

---

### 3.3 Idempotency Protection (Critical for Duplicates)

**Implement for all write operations:**

**Frontend generates Idempotency-Key:**

```javascript
// src/utils/idempotency.js
import uuid from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";

const IDEMPOTENCY_CACHE_KEY = "idempotency_cache";

export async function generateIdempotencyKey(operationId) {
  const key = uuid.v4();

  // Cache for 24 hours (in case of retries)
  const cache = JSON.parse(
    (await AsyncStorage.getItem(IDEMPOTENCY_CACHE_KEY)) || "{}",
  );
  cache[operationId] = {
    key,
    timestamp: Date.now(),
  };

  // Cleanup old entries (>24 hours)
  Object.keys(cache).forEach((op) => {
    if (Date.now() - cache[op].timestamp > 86400000) {
      delete cache[op];
    }
  });

  await AsyncStorage.setItem(IDEMPOTENCY_CACHE_KEY, JSON.stringify(cache));
  return key;
}
```

**Axios includes header:**

```javascript
// src/services/api.js
let idempotencyKey = null;

api.interceptors.request.use(async (config) => {
  // Generate idempotency key for write operations
  if (["post", "put", "patch", "delete"].includes(config.method)) {
    idempotencyKey = await generateIdempotencyKey(config.url);
    config.headers["Idempotency-Key"] = idempotencyKey;
  }
  return config;
});
```

**Backend processes idempotency:**

```javascript
// middleware/idempotency.js
const Prisma = require("../prismaClient.js");

async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers["idempotency-key"];

  if (
    !idempotencyKey ||
    !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
  ) {
    return next();
  }

  // Check if this request was already processed
  const existingRequest = await Prisma.idempotent_requests.findUnique({
    where: { idempotency_key: idempotencyKey },
  });

  if (existingRequest) {
    // Return cached response
    return res
      .status(existingRequest.status)
      .json(JSON.parse(existingRequest.response_body));
  }

  // Capture the response
  const originalSend = res.send;
  res.send = function (data) {
    // Store this request's response for future retries
    Prisma.idempotent_requests
      .create({
        data: {
          idempotency_key: idempotencyKey,
          status: res.statusCode,
          response_body: typeof data === "string" ? data : JSON.stringify(data),
          created_at: new Date(),
        },
      })
      .catch((err) => console.error("Idempotency cache error:", err));

    return originalSend.call(this, data);
  };

  next();
}

module.exports = idempotencyMiddleware;
```

**Prisma schema addition:**

```prisma
model idempotent_requests {
  idempotency_key String    @id
  status          Int
  response_body   String
  created_at      DateTime  @default(now())

  @@index([created_at])
}
```

---

### 3.4 Shared Rate Limiting (Redis-backed)

**Install Redis:**

```bash
npm install redis rate-limit-redis
```

**Update auth.js:**

```javascript
const redis = require("redis");
const RedisStore = require("rate-limit-redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.connect();

const sharedLimiterOptions = {
  store: new RedisStore({
    client: redisClient,
    prefix: "rate-limit:",
  }),
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
};

const loginLimiter = rateLimit(sharedLimiterOptions);
const registerLimiter = rateLimit(sharedLimiterOptions);

const passwordResetLimiter = rateLimit({
  ...sharedLimiterOptions,
  max: 5, // Stricter for password reset
});
```

**Rate limit tracking:**

- User IP address is the key
- Shared across both Render and Fly.io via Redis
- Prevents rate-limit bypass during failover

---

### 3.5 JWT_SECRET Management

**Option A: Environment variable sync (simplest)**
Use Render's + Fly's shared environment management:

```bash
# On Render
$ export JWT_SECRET="your-shared-secret"

# On Fly.io
$ fly secrets set JWT_SECRET="your-shared-secret"

# Verify
$ fly secrets list
```

**Option B: Secrets vault (recommended for production)**

Use AWS Secrets Manager, Doppler, or HashiCorp Vault:

```javascript
// index.js (on app startup)
const secretsManager = require("./services/secretsManager.js");

(async () => {
  const secrets = await secretsManager.fetchSecrets([
    "JWT_SECRET",
    "RESEND_API_KEY",
  ]);

  process.env.JWT_SECRET = secrets.JWT_SECRET;
  process.env.RESEND_API_KEY = secrets.RESEND_API_KEY;

  startServer();
})();
```

**Verify JWT_SECRET is consistent:**

```bash
# Test on Render
curl -X POST https://render-backend.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
# Get token1

# Test on Fly.io with token1
curl -X GET https://fly-backend.com/api/profile \
  -H "Authorization: Bearer token1"
# Should return 200, not 401
```

---

## Part 4: Sticky Failover (Not Recommended)

**Should you use sticky backend selection?** ❌ **NO**

**Why not:**

1. **Defeats the purpose of failover** — if primary is slow/degraded, user won't failover
2. **Harder to recover** — user stuck on Fly.io even after Render fully recovers
3. **No performance benefit** — both backends connect to same DB

**Better approach:** Dynamic failover with periodic re-checks of primary.

---

## Part 5: Production Checklist

### Pre-Deployment Tasks

- [ ] **Secrets Management**
  - [ ] Ensure JWT_SECRET is identical on both Render and Fly.io
  - [ ] Use a secrets vault (Doppler, AWS Secrets Manager) for critical values
  - [ ] Test JWT token exchange between backends

- [ ] **Database**
  - [ ] Verify both backends have run all migrations: `npx prisma migrate status`
  - [ ] Confirm DATABASE_URL and DIRECT_URL are set on both
  - [ ] Test Supabase connection limits: 100 concurrent max
  - [ ] Monitor: `SELECT count(*) FROM pg_stat_activity` during high load

- [ ] **Rate Limiting**
  - [ ] Deploy Redis instance (Render: add-on, Fly.io: Redis app)
  - [ ] Update both backends to use Redis store
  - [ ] Test: Hit rate limit on Render, verify Fly.io sees the count
  - [ ] Monitor: Check Redis memory usage

- [ ] **Idempotency**
  - [ ] Add `idempotent_requests` table migration
  - [ ] Deploy idempotency middleware on both backends
  - [ ] Test: Make request with custom Idempotency-Key header, retry same key, verify cached response
  - [ ] Cleanup: Implement job to purge old idempotency records (>24 hours)

- [ ] **Health Checks**
  - [ ] Enhance `/health` endpoint with DB connectivity check
  - [ ] Deploy enhanced endpoint to both backends
  - [ ] Test: Kill DB connection, verify `/health` returns 503
  - [ ] Frontend: Test failover triggered by health check

- [ ] **Frontend Failover Logic**
  - [ ] Deploy `BackendFailover` class to frontend
  - [ ] Integrate with Axios interceptors
  - [ ] Test: Make request, mock Render 500 error, verify Fly.io used for retry
  - [ ] Test: Verify fallback occurs after 3 consecutive errors
  - [ ] Test: Verify recovery check every 30 seconds

- [ ] **Monitoring & Alerting**
  - [ ] Setup Render error logs: Alert on 500+ errors in 5 min
  - [ ] Setup Fly.io error logs: Alert on 500+ errors in 5 min
  - [ ] Monitor Supabase connection pool: Alert if >80 concurrent
  - [ ] Monitor Redis: Alert if >80% memory used
  - [ ] Setup uptime monitoring: External health checks to both backends

- [ ] **Load Testing**
  - [ ] Simulate Render sleep: Kill Render instance mid-request
  - [ ] Verify frontend successfully fails over to Fly.io
  - [ ] Verify no duplicate writes occur
  - [ ] Verify rate limits honored across both backends
  - [ ] Verify JWT tokens work on both backends

- [ ] **Runbook & Incident Response**
  - [ ] Document: How to manually switch backends if needed
  - [ ] Document: How to reset rate limits if needed
  - [ ] Document: How to clear idempotency cache if needed
  - [ ] Document: How to check Supabase connection pool status

---

## Part 6: Production-Safe Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React Native)                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ BackendFailover Service                                 │   │
│  │ • Tracks current backend (Render | Fly.io)             │   │
│  │ • Failure counter (reset after 3 consecutive)          │   │
│  │ • Health check loop (every 30s)                        │   │
│  │ • Generates Idempotency-Key headers                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                  │                               │
│  Axios Interceptors             │                               │
│  • Add Authorization Bearer     │                               │
│  • Add Idempotency-Key          │                               │
│  • Handle 5xx → trigger failover│                               │
│                                  │                               │
└──────────────────────────────────┼───────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
           ┌────────▼─────────┐        ┌─────────▼────────┐
           │ Render Backend    │        │  Fly.io Backend  │
           │ (Primary)         │        │  (Fallback)      │
           │                   │        │                  │
           │ Express.js        │        │ Express.js       │
           │ ─────────────────│        │ ──────────────── │
           │ • Health check    │        │ • Health check   │
           │ • Idempotency MW  │        │ • Idempotency MW │
           │ • Redis rate-lim  │        │ • Redis rate-lim │
           │ • Auth middleware │        │ • Auth middleware│
           │ • Route handlers  │        │ • Route handlers │
           │                   │        │                  │
           └────────┬──────────┘        └──────────┬───────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  Shared Redis        │
                        │  (Rate limit store)  │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │ Supabase PostgreSQL  │
                        │  (Single source      │
                        │   of truth)          │
                        │                      │
                        │ Tables:              │
                        │ • users              │
                        │ • tasks              │
                        │ • subtasks           │
                        │ • categories         │
                        │ • idempotent_reqs    │
                        │ • password_tokens    │
                        └──────────────────────┘
```

---

## Part 7: Risk Comparison: Failover vs. No Failover

### With Failover (Recommended)

| Scenario                              | Downtime   | User Impact                          | Data Risk      |
| ------------------------------------- | ---------- | ------------------------------------ | -------------- |
| Render sleeps after 30 min inactivity | ~5–10 sec  | Brief stall, then works on Fly.io    | None           |
| Render instance crash                 | ~5–10 sec  | Brief stall, then works on Fly.io    | None           |
| Render network issue                  | ~5–10 sec  | Brief stall, then works on Fly.io    | None           |
| Supabase down                         | Indefinite | Both backends fail, no failover help | Potential loss |

### Without Failover (Current)

| Scenario                              | Downtime                      | User Impact                     | Data Risk      |
| ------------------------------------- | ----------------------------- | ------------------------------- | -------------- |
| Render sleeps after 30 min inactivity | ~30 min (cold start)          | App hangs, user force-kills app | None           |
| Render instance crash                 | ~5+ min (detection + restart) | App hangs                       | None           |
| Render network issue                  | ~5+ min                       | App hangs                       | None           |
| Supabase down                         | Indefinite                    | Both backends fail              | Potential loss |

**Failover saves ~25–50 minutes per incident.**

---

## Part 8: Recommended Timeout Durations

| Check                     | Timeout        | Reasoning                                    |
| ------------------------- | -------------- | -------------------------------------------- |
| Health check (background) | **5 seconds**  | Quick detection of dead backend              |
| Regular API request       | **15 seconds** | Already configured; good                     |
| Failover retry attempt    | **15 seconds** | Same as initial request                      |
| JWT token expiry          | **7 days**     | Already configured; long enough              |
| Idempotency cache TTL     | **24 hours**   | Prevents duplicate retries for a day         |
| Rate limit window         | **15 minutes** | Standard; prevents abuse                     |
| Health check interval     | **30 seconds** | Reasonable balance between load and recovery |
| Connection pool timeout   | **30 seconds** | Default Prisma value                         |

---

## Part 9: FAQ

**Q: Can I failover without shared Supabase database?**  
A: No. You'd need replication (PostgreSQL streaming replication, MySQL binlog replication). That's more complex and error-prone.

**Q: What if both backends fail?**  
A: User sees an error. Implement offline-first caching (AsyncStorage) so they can keep using the app in read-only mode. Not currently implemented.

**Q: Should I use Redis in development?**  
A: Optional. Rate limiting defaults to in-memory (sufficient for local testing). Only add Redis for production or multi-instance dev setup.

**Q: Can I use a different secret per backend?**  
A: No. JWT verification will fail. Both must use the same secret.

**Q: What if my Idempotency-Key table grows too large?**  
A: Add a cleanup job:

```javascript
// Every 6 hours, delete rows older than 24 hours
setInterval(
  async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await Prisma.idempotent_requests.deleteMany({
      where: { created_at: { lt: oneDayAgo } },
    });
  },
  6 * 60 * 60 * 1000,
);
```

**Q: Will this work with React Native?**  
A: Yes. Axios + AsyncStorage work in React Native. The failover logic is platform-agnostic.

**Q: Should I use sticky sessions?**  
A: No. Sticky sessions defeat automatic failover. Dynamic failover with periodic re-checks is better.

**Q: Can I test this without Fly.io?**  
A: Yes. Mock Render sleep locally by killing the process or throwing 503 errors. Verify frontend switches to Fly.io.

---

## Conclusion

Your architecture is **safe for automatic failover** with these implementations:

1. ✅ Deploy shared Redis for rate limiting
2. ✅ Add Idempotency-Key + database check for write operations
3. ✅ Deploy BackendFailover service to frontend
4. ✅ Enhance `/health` endpoint with DB checks
5. ✅ Verify JWT_SECRET is identical on both backends
6. ✅ Add monitoring + alerting

**Estimated implementation time:** 6–8 hours (includes testing).  
**Risk after implementation:** LOW.
