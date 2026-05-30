# Failover Implementation: Priority Roadmap

Choose your implementation path based on timeline and risk tolerance.

---

## Quick Decision Tree

### 🟢 **Minimum Viable Failover** (6 hours)

**Best for:** MVP deployments, low traffic, immediate failover need

**What you get:**

- ✅ Automatic failover on backend errors
- ✅ Database consistency (shared Supabase)
- ✅ JWT portability (same secret)
- ⚠️ No duplicate write protection
- ⚠️ Rate limits can be bypassed
- ✅ Health checks enabled

**Implement:**

1. Frontend BackendFailover class (2h)
2. Axios integration (1h)
3. Health endpoint enhancement (1h)
4. Environment variable setup (1h)
5. Local testing (1h)

**Code commitment:** ~300 lines of frontend code, 50 lines backend

**Risk:** Medium (duplicate writes possible on timeout retries)

**Go to:** [Minimum Implementation](#minimum-viable-implementation)

---

### 🟡 **Production-Ready Failover** (14 hours)

**Best for:** Production with moderate traffic, security concerns

**What you get:**

- ✅ Automatic failover on backend errors
- ✅ Duplicate write protection (idempotency)
- ✅ Database consistency
- ⚠️ Rate limits NOT shared (if Redis not deployed)
- ✅ Health checks enabled
- ✅ Monitoring ready

**Implement:**

1. Minimum Viable (6h)
2. Idempotency protection (3h)
3. Enhanced monitoring (2h)
4. Documentation & runbooks (2h)
5. Load testing (1h)

**Code commitment:** ~600 lines total, plus Redis

**Risk:** Low (with Redis for rate limiting)

**Go to:** [Production Implementation](#production-ready-implementation)

---

### 🟣 **Enterprise-Grade Failover** (17 hours)

**Best for:** Production with high traffic, security/compliance requirements

**What you get:**

- ✅ All of production-ready PLUS:
- ✅ Shared rate limiting via Redis
- ✅ Automatic JWT_SECRET rotation support
- ✅ Comprehensive monitoring & alerting
- ✅ Incident response runbook
- ✅ Full audit trail
- ✅ Graceful degradation

**Implement:**

1. Production-Ready (14h)
2. Redis rate limiting (2h)
3. Secrets vault integration (optional)
4. Monitoring dashboard setup (1h)

**Code commitment:** ~800 lines total, Redis + monitoring tools

**Risk:** Very Low

**Go to:** [Enterprise Implementation](#enterprise-grade-implementation)

---

## Minimum Viable Implementation

**Timeline:** 6 hours | **Team:** 1 developer

### Phase 1: Frontend Failover (2 hours)

```bash
cd to-do-app-frontend

# Copy this code to src/services/backendFailover.js
# (See Implementation Guide for full code)

# Copy modified api.js
# (See Implementation Guide for full code)

# Update .env
EXPO_PUBLIC_API_BASE_URL=https://your-render-backend.com/api
EXPO_PUBLIC_FALLBACK_API_URL=https://your-fly-backend.fly.dev/api

npm start
```

**Validate:**

- [ ] App starts without errors
- [ ] Network tab shows fallback headers being set
- [ ] Health checks logged in console

### Phase 2: Backend Health (1 hour)

```bash
cd to-do-app-backend-node

# Add to index.js:
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

npm run dev
curl http://localhost:3000/health
# Expected: { "status": "healthy", "timestamp": "..." }
```

**Validate:**

- [ ] Health endpoint responds immediately (<100ms)
- [ ] No database calls in health check (too slow)

### Phase 3: Environment Variables (1 hour)

**Render:**

```bash
# Dashboard → Settings → Environment Variables
JWT_SECRET=your-secret-value
RESEND_API_KEY=your-api-key
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

**Fly.io:**

```bash
fly secrets set JWT_SECRET="same-value-as-render"
fly secrets set RESEND_API_KEY="same-value-as-render"
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set DIRECT_URL="postgresql://..."

fly secrets list
```

**Validate:**

- [ ] Both backends have identical secrets
- [ ] Test token from Render works on Fly.io:
  ```bash
  TOKEN=$(curl -X POST https://render.com/api/login -d '...' | jq -r '.token')
  curl -X GET https://fly.io/api/profile \
    -H "Authorization: Bearer $TOKEN"
  # Expected: 200 OK (not 401)
  ```

### Phase 4: Local Testing (1 hour)

```bash
# Terminal 1: Start Render backend
npm run dev  # port 3000

# Terminal 2: Start Fly.io backend (different port)
PORT=3001 npm run dev

# Terminal 3: Start frontend with both URLs in .env
cd ../to-do-app-frontend
npm start

# Terminal 4: Kill Render backend
kill -9 <PID>

# Expected in frontend logs:
# [Failover] Failure count: 3
# [Failover] Attempting to switch to ...fallback...
# [Failover] Successfully switched to fallback

# Terminal 5: Make request
# Expected: Works on Fly.io after brief stall
```

### Phase 5: Production Deploy (1 hour)

```bash
# Render: Auto-deploys on git push
git add .
git commit -m "Add minimal failover: health check + axios integration"
git push origin main

# Verify in Render dashboard → Deployments
# Deploy log should show no errors

# Fly.io
fly deploy

# Verify deployment
fly logs

# Frontend
eas build --platform ios --auto-submit
eas build --platform android --auto-submit
```

**Validate in Production:**

- [ ] App connects to primary backend
- [ ] Users can login, create tasks
- [ ] No errors in console logs
- [ ] Health endpoint accessible

---

## Production-Ready Implementation

**Timeline:** 14 hours | **Team:** 1–2 developers | **Cost:** ~$50/month for Redis

Includes everything from Minimum Viable PLUS:

### Phase 6: Idempotency Protection (3 hours)

```bash
cd to-do-app-backend-node

# Create migration
npx prisma migrate dev --name add_idempotent_requests

# This creates:
# - idempotent_requests table
# - Cleanup job (deletes records older than 24 hours)

# Frontend already sends Idempotency-Key via Axios
# (See api.js in Implementation Guide)

npm run dev
npm test  # If tests exist
```

**Validate:**

```bash
# Make same request twice with same Idempotency-Key
IDEMPOTENCY_KEY="test-123"
RESPONSE1=$(curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"title":"Test"}')

RESPONSE2=$(curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"title":"Test"}')

# Both responses should be identical
# Only 1 task should exist
```

### Phase 7: Enhanced Monitoring (2 hours)

```bash
# Setup alerts in Render dashboard
Dashboard → Monitoring
- Alert 1: Error rate > 5% in 5 minutes
- Alert 2: Response time > 2 seconds average

# Setup alerts in Fly.io dashboard
Dashboard → Monitoring
- Alert 1: CPU > 80%
- Alert 2: Memory > 80%

# (Optional) Setup Datadog/New Relic integration
npm install datadog-browser-rum

# Add to App.js
import { datadogRum } from '@datadog/browser-rum';
datadogRum.init({ applicationId: '...', clientToken: '...' });
```

### Phase 8: Documentation (2 hours)

Copy these to your team wiki:

- [ ] Architecture diagram (from Analysis doc)
- [ ] Failover runbook (from Runbook doc)
- [ ] Emergency contact procedures
- [ ] Monitoring dashboard links

### Phase 9: Load Testing (1 hour)

```bash
# Use wrk or Apache Bench to simulate traffic
wrk -t4 -c100 -d30s \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tasks

# Kill primary backend during test
# Verify traffic switches to fallback

# Verify no duplicates in database
```

**Success Criteria:**

- ✅ 0 data loss
- ✅ 0 duplicate writes
- ✅ <5 second failover time
- ✅ Automatic recovery to primary

---

## Enterprise-Grade Implementation

**Timeline:** 17 hours | **Team:** 1–2 developers | **Cost:** ~$100+/month (Datadog, Redis, secrets vault)

Includes everything from Production-Ready PLUS:

### Phase 10: Redis Rate Limiting (2 hours)

```bash
# Provision Redis on Render add-ons or use Fly.io Redis app
fly redis create

# Or for Render: Dashboard → Add Resource → Redis

# Set environment variable
fly secrets set REDIS_URL="redis://..."
# OR on Render
# Environment → REDIS_URL

# Update auth.js (see Implementation Guide)
npm install redis rate-limit-redis

npm run dev
```

**Validate:**

```bash
# Make 15+ login attempts to hit rate limit on primary
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/login \
    -d '{"email":"x@x.com","password":"wrong"}' &
done

# Hit rate limit on port 3000
# Verify port 3001 (fallback) also respects the limit
```

### Phase 11: Secrets Vault (optional, 2 hours)

```bash
# Use Doppler or AWS Secrets Manager
# Never hardcode secrets in environment variables

# Example with Doppler:
npm install @doppler/cli

doppler setup  # Authenticate

# Store secrets centrally
doppler secrets set JWT_SECRET="..."
doppler secrets set RESEND_API_KEY="..."

# Both Render and Fly.io pull from Doppler on startup
```

### Phase 12: Comprehensive Monitoring (2 hours)

```bash
# Datadog integration
npm install @datadog/browser-rum

# New Relic integration
npm install newrelic

# Setup Grafana dashboard (optional)
# Setup PagerDuty alerts (optional)

# Create custom alerts:
# - Failover triggered (notify team)
# - Rate limit spike (potential attack)
# - Idempotency cache size > 10k (database issue)
# - JWT validation failures > 100/min (secret mismatch)
```

**Dashboard view should include:**

- Request rate (primary vs fallback split)
- Failover count (per day/week)
- Error rate by backend
- Response time percentiles
- Database connection pool usage
- Redis memory usage
- Idempotency cache size

---

## Cost Comparison

| Tier       | Render | Fly.io | Redis               | Total/mo |
| ---------- | ------ | ------ | ------------------- | -------- |
| Minimum    | $0–7   | $0–5   | None                | $0–12    |
| Production | $7–12  | $5–10  | $15–25              | $27–47   |
| Enterprise | $12–25 | $10–15 | $25–50 + monitoring | $100–200 |

---

## Recommended Starting Point

**If you have <6 hours:** Implement Minimum Viable ✅

**If you have 12–16 hours:** Implement Production-Ready ✅

**If this is for paying customers:** Implement Enterprise-Grade ✅

---

## Rollback Plan

If something breaks after deployment:

**Quick Rollback (5 minutes):**

```bash
# Disable failover by pointing frontend to only primary
EXPO_PUBLIC_FALLBACK_API_URL=null

# Or remove failover logic from api.js
# Just use simple retry on timeout

eas build --platform ios --auto-submit
eas build --platform android --auto-submit
```

**Full Rollback (30 minutes):**

```bash
# Revert git commits
git revert <commit-hash>
git push origin main

# Render auto-deploys old version
# Fly.io: fly deploy
# Frontend: eas build
```

---

## Post-Launch Monitoring

**Week 1 (go-live):**

- [ ] Monitor error logs 24/7
- [ ] Check for duplicate writes
- [ ] Verify rate limiting works
- [ ] Test manual failover once

**Week 2–4:**

- [ ] Weekly health check of both backends
- [ ] Review logs for anomalies
- [ ] Monitor Supabase connection pool
- [ ] Check Redis memory growth

**Monthly:**

- [ ] Full load test
- [ ] Verify secrets still in sync
- [ ] Update runbook if needed
- [ ] Team knowledge-share / documentation review

---

## FAQ

**Q: Can I implement this gradually?**  
A: Yes! Start with Minimum Viable, then add idempotency and Redis over time.

**Q: Do I need both Render AND Fly.io?**  
A: Only if you want automatic failover. Otherwise, just use one provider.

**Q: What if I don't want to implement Redis?**  
A: That's fine. Minimum Viable works without Redis. Rate limits will be per-backend (not shared), which is a security tradeoff.

**Q: How much does this cost to run?**  
A: $0–50/month depending on traffic. Free tier works for low-traffic apps.

**Q: Can I test this in production?**  
A: Yes! Kill one backend during low-traffic hours. Verify failover works, then restart.

**Q: What if failover fails?**  
A: Frontend automatically retries on the current backend (or keeps trying both). Users experience a brief stall but the app doesn't crash.

---
