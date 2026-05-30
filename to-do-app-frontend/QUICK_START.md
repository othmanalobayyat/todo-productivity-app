# Failover Implementation: Quick Start

Complete backend failover in 15 minutes.

---

## What You Get

✅ Automatic failover from Render → Fly.io  
✅ No breaking changes (fully backward compatible)  
✅ Zero database/backend modifications  
✅ Same API interface (drop-in replacement)  
✅ Smart retry (only retries network errors, not validation errors)

---

## Files Created/Modified

| File                        | What Changed                    |
| --------------------------- | ------------------------------- |
| `config.js`                 | +1 line (export fallback URL)   |
| `failoverApi.js`            | NEW (120 lines, self-contained) |
| `FAILOVER_SETUP.md`         | NEW (setup guide)               |
| `FAILOVER_CODE_EXAMPLES.md` | NEW (code examples)             |
| `ENV_SETUP.md`              | NEW (env config)                |
| `api.js`                    | NONE (unchanged)                |

---

## 15-Minute Setup

### Step 1: Add Environment Variable (2 min)

```bash
cd to-do-app-frontend

# Add to .env file:
echo "EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api" >> .env

# Verify:
cat .env
```

### Step 2: Review New Files (3 min)

- Read [FAILOVER_SETUP.md](./FAILOVER_SETUP.md) (5 min overview)
- Glance at [FAILOVER_CODE_EXAMPLES.md](./FAILOVER_CODE_EXAMPLES.md) (patterns)

### Step 3: Update One Screen (5 min)

Start with `LoginScreen.js` as a test:

```javascript
// Line 1: Add import
import failoverApi from "../services/failoverApi";

// Line 13: Replace api with failoverApi
// OLD: const response = await api.post('/login', ...)
// NEW: const response = await failoverApi.post('/login', ...)
```

### Step 4: Test Locally (5 min)

```bash
npm start

# Open app and try to login
# Should work normally on Render
# If Render fails, should auto-retry on Fly.io
# Check console for [Failover] messages
```

---

## Migration Path

### Phase 1: Critical Paths (Today)

Update these first:

- [ ] LoginScreen.js
- [ ] RegisterScreen.js
- [ ] TasksScreen.js (fetch)

### Phase 2: Write Operations (Tomorrow)

- [ ] CreateTaskScreen.js
- [ ] EditTaskScreen.js
- [ ] Delete operations

### Phase 3: Nice to Have (Later)

- [ ] ProfileScreen.js
- [ ] ResetPasswordScreen.js
- [ ] Other screens

---

## Copy-Paste Ready Code

### Import failoverApi:

```javascript
import failoverApi from "../services/failoverApi";
```

### Login:

```javascript
const result = await failoverApi.post("/login", { email, password });
```

### Fetch tasks:

```javascript
const { tasks } = await failoverApi.get("/tasks");
```

### Create task:

```javascript
const task = await failoverApi.post("/tasks", { title, priority });
```

### Update task:

```javascript
const updated = await failoverApi.put(`/tasks/${id}`, { completed: true });
```

### Delete task:

```javascript
await failoverApi.delete(`/tasks/${id}`);
```

---

## Verify It Works

### Local Test

```bash
# Terminal 1: Start primary backend (port 3000)
cd to-do-app-backend-node && npm run dev

# Terminal 2: Start fallback backend (port 3001)
PORT=3001 npm run dev

# Terminal 3: Update .env with localhost URLs
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_API_FALLBACK_URL=http://localhost:3001/api

# Terminal 4: Start app
npm start

# Terminal 5: Monitor
# Try normal request → works on port 3000
# Kill port 3000 → app switches to port 3001
# Check console logs for [Failover] messages
```

### Production Test

```bash
# App is configured with:
# Primary: https://todo-productivity-app-06p4.onrender.com/api
# Fallback: https://todo-productivity-app.fly.dev/api

# During low traffic, try:
# 1. Kill Render backend (pause dyno or shut down)
# 2. Use app normally
# 3. Should auto-switch to Fly.io
# 4. Restart Render
# 5. Should auto-switch back
```

---

## How Failover Works

```
Request to /tasks
       ↓
    Try Render (5s timeout)
       ↓
   Success? → Return response ✓
       ↓
   Timeout/Network Error/5xx? → Try Fly.io (5s timeout)
       ↓
   Success? → Return response ✓
       ↓
   Failed? → Reject error
```

---

## When Failover Activates

✅ **Yes, retry on fallback:**

- Network timeout (5 seconds)
- Connection refused
- Network unreachable
- 500/502/503 server errors

❌ **No, fail immediately:**

- 400 Bad Request
- 401 Unauthorized
- 404 Not Found
- 422 Validation Error
- Any 4xx error

---

## Rollback Plan

If something breaks:

```bash
# Option 1: Keep using regular api
# Just don't use failoverApi, keep using api like before

# Option 2: Remove failover URLs
# Delete EXPO_PUBLIC_API_FALLBACK_URL from .env
# App will still work, just no failover

# Option 3: Git revert
git revert <commit> && git push
```

**Zero risk.** Regular `api` service is unchanged.

---

## Common Questions

**Q: Do I have to use failoverApi?**  
A: No. Use it only where you want failover. Regular `api` still works.

**Q: Will this slow down my app?**  
A: No. Normal requests are unaffected. Failover only activates on error.

**Q: What if both backends fail?**  
A: User sees error after ~10 seconds (5s per backend). Same as before.

**Q: Do I need to update every screen?**  
A: No. Update critical paths first (login, tasks). Other screens can stay as-is.

**Q: Can I test this locally?**  
A: Yes. See "Local Test" section above.

**Q: What if JWT secret differs between backends?**  
A: Tokens will fail on fallback. Verify both backends have identical JWT_SECRET.

---

## Checklist

- [ ] Added fallback URL to `.env`
- [ ] Reviewed FAILOVER_SETUP.md
- [ ] Updated LoginScreen to use failoverApi
- [ ] Tested locally (primary works)
- [ ] Killed primary backend (fallback works)
- [ ] Updated TasksScreen to use failoverApi
- [ ] Updated other critical screens (POST/PUT/DELETE)
- [ ] Deployed to production
- [ ] Verified both backends are live
- [ ] Monitored app for 24 hours

---

## Support Files

| File                                                     | Purpose                   |
| -------------------------------------------------------- | ------------------------- |
| [FAILOVER_SETUP.md](./FAILOVER_SETUP.md)                 | Complete setup guide      |
| [FAILOVER_CODE_EXAMPLES.md](./FAILOVER_CODE_EXAMPLES.md) | Screen-by-screen examples |
| [ENV_SETUP.md](./ENV_SETUP.md)                           | Environment variables     |

---

## Timeline

- **15 min:** Basic setup ← You are here
- **30 min:** Update 3 screens (login, tasks, create)
- **1 hour:** Update all write operations
- **2 hours:** Test thoroughly
- **Deploy:** Push to production

---

## Next Step

Pick a screen and update it:

1. Open `LoginScreen.js`
2. Add: `import failoverApi from '../services/failoverApi';`
3. Change: `api.post('/login'` to `failoverApi.post('/login'`
4. Save and test

That's it! You've implemented failover.

---
