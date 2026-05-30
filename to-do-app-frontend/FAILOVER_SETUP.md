# Frontend Failover Setup Guide

## Overview

Simple automatic backend failover for React Native app. Render → Fly.io if primary fails.

**What changed:**

- ✅ `config.js` — now exports both primary and fallback URLs
- ✅ `src/services/failoverApi.js` — new service with automatic retry logic
- ✅ Existing `api.js` — unchanged, backward compatible

**No breaking changes.** Existing code keeps working as-is.

---

## Setup

### 1. Environment Variables

Add to `.env`:

```bash
# Primary backend (Render)
EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api

# Fallback backend (Fly.io)
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api
```

### 2. Update Existing Code (Gradual)

**Option A: Keep using regular `api` (no changes needed)**

```javascript
import api from "../services/api";
const tasks = await api.get("/tasks"); // Works as before, no failover
```

**Option B: Use `failoverApi` for critical paths (recommended)**

```javascript
import failoverApi from "../services/failoverApi";
const tasks = await failoverApi.get("/tasks"); // Auto-retries on Fly.io if Render fails
```

### 3. Recommended Migration Path

Update these critical endpoints to use `failoverApi`:

1. **Authentication** (`LoginScreen.js`)

   ```javascript
   // OLD: api.post('/login', ...)
   // NEW:
   const result = await failoverApi.post("/login", { email, password });
   ```

2. **Task operations** (`TasksScreen.js`)

   ```javascript
   // OLD: api.get('/tasks')
   // NEW:
   const tasks = await failoverApi.get("/tasks");
   ```

3. **Profile** (`ProfileScreen.js`)
   ```javascript
   // OLD: api.get('/profile')
   // NEW:
   const profile = await failoverApi.get("/profile");
   ```

---

## API Reference

### Methods

All methods accept the same parameters as axios:

```javascript
// GET
failoverApi.get(endpoint, config?)

// POST
failoverApi.post(endpoint, data, config?)

// PUT
failoverApi.put(endpoint, data, config?)

// PATCH
failoverApi.patch(endpoint, data, config?)

// DELETE
failoverApi.delete(endpoint, config?)
```

### Examples

```javascript
import failoverApi from "../services/failoverApi";

// Get all tasks
const { tasks } = await failoverApi.get("/tasks");

// Create task
const task = await failoverApi.post("/tasks", {
  title: "Buy milk",
  priority: "high",
  due_date: "2026-05-30",
});

// Update task
const updated = await failoverApi.put("/tasks/42", {
  completed: true,
});

// Delete task
await failoverApi.delete("/tasks/42");

// Custom headers (if needed)
const data = await failoverApi.get("/profile", {
  headers: { "X-Custom": "value" },
});
```

---

## How It Works

1. **Request made to Render** (primary)
2. **Render responds?** → Return response (done)
3. **Render fails?** → Automatically retry on Fly.io
4. **Fly.io responds?** → Return response
5. **Fly.io fails?** → Reject with error

**Retryable errors:**

- ✅ Network timeout (5 seconds)
- ✅ Network unreachable
- ✅ Connection refused
- ✅ 5xx server errors

**Non-retryable errors (fail immediately):**

- ❌ 4xx client errors (400, 403, 404, etc.)
- ❌ 401 Unauthorized
- ❌ Validation errors

---

## Logging

When failover happens, you'll see in console:

```
[Failover] Primary backend failed (ECONNABORTED). Attempting fallback...
[Failover] Request succeeded on fallback backend
```

Or if both fail:

```
[Failover] Primary backend failed (ECONNABORTED). Attempting fallback...
[Failover] Fallback backend also failed: Network error
```

---

## Testing Failover Locally

### Prerequisites

- Running Render backend on port 3000
- Running Fly.io backend on port 3001
- Frontend configured with both URLs

### Test Steps

```bash
# Terminal 1: Start Render backend
cd to-do-app-backend-node
npm run dev  # http://localhost:3000/api

# Terminal 2: Start Fly backend (different port)
PORT=3001 npm run dev  # http://localhost:3001/api

# Terminal 3: Configure frontend with both URLs
cd ../to-do-app-frontend
cat > .env << EOF
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_API_FALLBACK_URL=http://localhost:3001/api
EOF

# Terminal 4: Start app
npm start

# Terminal 5: Test failover
# 1. Use app normally (should work on port 3000)
# 2. Kill port 3000: kill -9 <PID>
# 3. Try again - app should auto-switch to port 3001
# 4. Check console logs for "[Failover]" messages
# 5. Restart port 3000
```

---

## Migration Checklist

Pick the endpoints you want to protect with failover:

- [ ] Login/Register → Use `failoverApi`
- [ ] Fetch tasks → Use `failoverApi`
- [ ] Create task → Use `failoverApi`
- [ ] Update task → Use `failoverApi`
- [ ] Delete task → Use `failoverApi`
- [ ] Fetch profile → Use `failoverApi`
- [ ] Upload profile image → Use `failoverApi` (if applicable)

Non-critical endpoints can stay with regular `api`:

- Analytics/logging
- Offline-only operations
- UI-only requests

---

## Troubleshooting

**Q: Failover not triggering?**
A: Verify both URLs are set in `.env`. Check logs for `[Failover]` messages.

**Q: Getting auth errors after failover?**
A: Both backends must have identical `JWT_SECRET`. Check environment variables.

**Q: Request hangs for 10 seconds before returning?**
A: The 5-second timeout is by design. Reduce with: `timeout: 3000` in `failoverApi.js` line 14.

**Q: Fallback doesn't work?**
A: Make sure `EXPO_PUBLIC_API_FALLBACK_URL` is set. If not set, failover is disabled.

---

## Performance Notes

- **Normal requests:** <100ms (no slowdown)
- **Primary failure → fallback:** ~5-6 seconds (5s timeout + switch)
- **Both fail:** Returns error after ~10 seconds total

---

## When to Use `failoverApi` vs `api`

| Operation         | Use           | Reason                        |
| ----------------- | ------------- | ----------------------------- |
| Login             | `failoverApi` | Critical, users need fallback |
| Fetch tasks       | `failoverApi` | Core feature, high importance |
| Create task       | `failoverApi` | User data, important          |
| Update task       | `failoverApi` | User data, important          |
| Delete task       | `failoverApi` | User data, important          |
| Analytics         | `api`         | Non-critical, skip failover   |
| Debug logs        | `api`         | Non-critical, skip failover   |
| Optional features | `api`         | Low priority, skip failover   |

**Rule of thumb:** Use `failoverApi` for operations users care about.

---

## Production Deployment

1. Add fallback URL to all deployment environments:
   - **Render:** Dashboard → Settings → Environment Variables
   - **Expo EAS:** `eas.json` → environment variables
   - **Local:** `.env` file

2. Verify both backends are running and healthy:

   ```bash
   curl https://todo-productivity-app-06p4.onrender.com/api/ping
   curl https://todo-productivity-app.fly.dev/api/ping
   ```

3. Deploy frontend with new changes:

   ```bash
   eas build --platform ios --auto-submit
   eas build --platform android --auto-submit
   ```

4. Monitor app during rollout:
   - Check console logs for failover events
   - Monitor error rates
   - Verify no duplicate data

---

## Minimal Example

Here's the minimal change needed to add failover to a screen:

**Before:**

```javascript
import api from "../services/api";

export default function TasksScreen() {
  useEffect(() => {
    api.get("/tasks").then(setTasks);
  }, []);
}
```

**After:**

```javascript
import failoverApi from "../services/failoverApi"; // ← Add this

export default function TasksScreen() {
  useEffect(() => {
    failoverApi.get("/tasks").then(setTasks); // ← Just change `api` to `failoverApi`
  }, []);
}
```

That's it! One import, one name change. No other modifications needed.

---

## Files Changed

| File             | Change                          | Impact                          |
| ---------------- | ------------------------------- | ------------------------------- |
| `config.js`      | Export both URLs                | 1 line                          |
| `failoverApi.js` | NEW service                     | 120 lines (self-contained)      |
| `api.js`         | None                            | 0 changes (backward compatible) |
| Existing screens | Optional: `api` → `failoverApi` | Gradual migration               |

---
