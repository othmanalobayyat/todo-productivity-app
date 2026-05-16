# Todo Productivity App

A full-stack mobile productivity app for building consistent habits through task management, smart insights, daily streak tracking, and a lightweight gamification system.

> Originally developed during a university course (_Web & Mobile Development 2_). I continued building it independently, adding the streak system, smart insights, calendar view, subtasks, full password recovery flow, profile stats, and achievement badges.

---

## License & Usage

Copyright (c) 2026 Othman Alobayyat. All Rights Reserved.

This repository is publicly visible for portfolio and code review purposes only. The source code, assets, and all other contents remain the exclusive property of the author. Reuse, redistribution, modification, or commercial use of any part is not permitted without prior written permission.

See [LICENSE](./LICENSE) for full terms.

---

## Features

### Task Management
- Create, edit, and delete tasks with title, description, priority (low / medium / high), due date, and category
- Mark tasks complete — records a `completed_at` timestamp used by the streak engine
- Filter by status (all / pending / completed) and sort by priority or due date
- Tasks grouped into Pending / Completed sections with section headers
- Contextual overflow menu (edit / delete) with a delete confirmation modal

### Subtasks
- Each task can have unlimited subtasks
- Add, toggle, and delete subtasks from the task detail screen
- Progress bar on task cards shows subtask completion ratio

### Smart Insights
- Dynamic message on the tasks screen surfaces what needs attention: overdue tasks, high-priority items, tasks due today, or an all-clear
- Insight pills highlight overdue count, due-today count, and high-priority pending count

### Streak System
- Tracks consecutive days with at least one completed task
- Uses the `completed_at` field on each task
- Walks backward from today (or yesterday, if nothing done yet today) to count unbroken days
- All comparisons use local device time — never UTC — to prevent midnight timezone bugs

### Calendar View
- Full month calendar with dot markers on dates that have tasks
- Tap any date to see the tasks due that day, with priority badges

### Profile Dashboard
- Stats: current streak, total tasks completed, overall success rate
- Achievement badges (frontend-computed): Focused Week, Task Crusher, 7 Day Streak, Consistency Master
- Edit name and email
- Change password (authenticated)

### Authentication & Security
- Register and login with JWT (7-day expiry)
- **Forgot password** — sends a Resend-powered HTML email with a secure reset link
- **Reset password** — deep-link flow: `todoapp://reset-password?token=X&email=Y`; token and email are auto-extracted from the URL, never visible to the user
- **Change password** — requires current password; protected by `authMiddleware`
- Rate limiting: login/register at 15 req / 15 min; password reset at 5 req / 15 min
- Tokens stored as SHA-256 hashes in the DB; raw token only travels in the email link
- One-time use: token is deleted immediately on successful reset
- Generic forgot-password response prevents email enumeration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native 0.81.5, Expo ~54 |
| Navigation | React Navigation 7 (Stack + Bottom Tab) |
| UI | React Native Paper 4.9, Vector Icons (FA / FA5 / Ionicons) |
| Calendar | react-native-calendars |
| HTTP client | Axios + AsyncStorage interceptor |
| Deep linking | expo-linking |
| Backend (primary) | Node.js, Express 5, Prisma 5, JWT |
| Email | Resend |
| Database | PostgreSQL (Supabase) |
| Backend (alt) | Laravel 11, PHP 8.2+, Laravel Sanctum |
| Hosting | Render (Node backend), Expo EAS (Android APK), Vercel (web) |

---

## Architecture

```
React Native (Expo)
       │
       │  Axios — Bearer token injected by request interceptor
       ▼
REST API /api/*
       │
       ├── Node.js / Express 5 (JWT)   ← primary, live on Render
       └── Laravel 11 (Sanctum)        ← alternative backend
                    │
                    ▼
          PostgreSQL (Supabase)
```

The frontend connects to whichever backend is set in `EXPO_PUBLIC_API_BASE_URL`. Both expose an identical API surface, so switching requires no frontend changes.

### Navigation Structure

```
Stack (root)
├── Welcome                    (unauthenticated)
├── Login                      (unauthenticated)
├── Register                   (unauthenticated)
├── ForgotPassword             (unauthenticated)
├── Main → Bottom Tabs         (authenticated)
│   ├── Tasks
│   ├── Calendar
│   └── Profile
├── CreateTask                 (authenticated)
├── EditTask                   (authenticated)
├── TaskDetails                (authenticated)
├── ChangePassword             (authenticated)
├── EditProfile                (authenticated)
└── ResetPassword              (always registered — deep link target)
```

`ResetPassword` is registered outside the auth conditional blocks so the deep link works regardless of whether the user is currently logged in.

### Node Backend API

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | — | Register (rate-limited) |
| POST | `/api/login` | — | Login, returns JWT (rate-limited) |
| POST | `/api/logout` | ✓ | Stateless logout |
| POST | `/api/forgot-password` | — | Send reset email (rate-limited, 5/15min) |
| POST | `/api/reset-password` | — | Consume token, update password |
| PUT | `/api/change-password` | ✓ | Change password (current required) |
| GET | `/api/profile` | ✓ | Get user profile |
| PUT | `/api/profile` | ✓ | Update name and email |
| GET | `/api/tasks` | ✓ | List tasks with subtask counts |
| POST | `/api/tasks` | ✓ | Create task |
| GET | `/api/tasks/:id` | ✓ | Get task |
| PUT | `/api/tasks/:id` | ✓ | Update task |
| DELETE | `/api/tasks/:id` | ✓ | Delete task |
| PATCH | `/api/tasks/:id/complete` | ✓ | Toggle complete (sets `completed_at`) |
| GET | `/api/tasks/:taskId/subtasks` | ✓ | List subtasks |
| POST | `/api/tasks/:taskId/subtasks` | ✓ | Add subtask |
| PATCH | `/api/tasks/:taskId/subtasks/:id/toggle` | ✓ | Toggle subtask |
| DELETE | `/api/tasks/:taskId/subtasks/:id` | ✓ | Delete subtask |
| GET | `/api/task-categories` | ✓ | List global categories |

### Password Recovery Flow

```
User → "Forgot Password" screen
  → POST /api/forgot-password { email }
  → Server: generates crypto.randomBytes(32), stores SHA-256 hash in DB
  → Resend sends HTML email with link:
      todoapp://reset-password?token=<raw>&email=<encoded>   (mobile)
      https://app.vercel.app/reset-password?token=...&email=... (web)
  → User taps link → React Navigation parses query params → route.params
  → ResetPasswordScreen reads token + email from route.params (never visible)
  → POST /api/reset-password { email, token, password, password_confirmation }
  → Server: hash token, compare, check 1-hour expiry, update password, delete token
```

Vercel `vercel.json` rewrites all paths to `/index.html` so the SPA can handle the `/reset-password` path.

---

## Screens

| Screen | Description |
|---|---|
| Welcome | Landing screen with login / register CTAs |
| Login | Email + password with "Forgot Password" link |
| Register | Name, email, password |
| ForgotPassword | Email input → sends reset email; success state shows inbox message |
| ResetPassword | Auto-extracts token + email from URL; shows only new password fields |
| Tasks | Main hub — live insights, streak badge, filter/sort controls, grouped task list |
| Task Details | Full task view with subtask management |
| Create / Edit Task | Form: title, description, priority, due date, category |
| Calendar | Month calendar with task dots; tap date to see day's tasks |
| Profile | Stats (streak, completed, success rate), achievements, security, edit profile |
| Change Password | Current + new password with inline validation |
| Edit Profile | Update name and email |

---

## Setup

### Prerequisites

- Node.js 18+
- Expo Go on a device or Android emulator
- PostgreSQL (Supabase free tier works)
- A [Resend](https://resend.com) account for transactional email (free tier: 3,000 emails/month)

### Node Backend (Primary)

```bash
cd to-do-app-backend-node
npm install
cp .env.example .env       # fill in values — see env vars table below
npx prisma generate
npx prisma db push         # creates tables
node prisma/seed.js        # seeds default categories
npm run dev                # nodemon, port 3000
```

### Frontend

```bash
cd to-do-app-frontend
npm install
cp .env.example .env
# EXPO_PUBLIC_API_BASE_URL=http://<your-local-ip>:3000/api
npx expo start
```

Scan the QR code with Expo Go or press `a` for Android emulator. Use your machine's LAN IP — not `localhost` — when testing on a physical device.

### Laravel Backend (Alternative)

```bash
cd to-do-app-backend
composer install && npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
composer run dev           # starts server + queue + Vite together
```

API available at `http://127.0.0.1:8000`.

---

## Environment Variables

### Node Backend — `to-do-app-backend-node/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase connection pooler URL (for Prisma queries) |
| `DIRECT_URL` | Supabase direct connection URL (for `prisma db push` / migrations) |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `PORT` | Server port (default: `3000`) |
| `CORS_ORIGIN` | Allowed origin(s), comma-separated (optional; `*` if unset) |
| `APP_URL` | Base URL for password reset links — `todoapp://` for mobile, `https://your-domain.com` for web |
| `RESEND_API_KEY` | API key from resend.com |
| `EMAIL_FROM` | Sender address, e.g. `noreply@yourdomain.com` |

> Both `DATABASE_URL` and `DIRECT_URL` must be set. Setting only one will cause `prisma migrate dev` to fail (Supabase requires a direct connection for DDL operations).

### Frontend — `to-do-app-frontend/.env`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Full URL of the active backend API, e.g. `http://192.168.1.x:3000/api` |

---

## Architecture Decisions

**Per-screen task fetching**
Each screen that needs tasks (`TasksScreen`, `CalendarScreen`, `ProfileScreen`) fetches independently via a `navigation.addListener('focus', ...)` listener. This keeps state local, avoids stale data when switching tabs, and removes the need for a global store. The tradeoff is redundant network requests; acceptable at current scale.

**Frontend-computed achievements**
Achievement badges (streak thresholds, completion counts) are calculated on the frontend from the task list already in memory. This avoids a dedicated backend endpoint and keeps the backend simple. When the feature matures, thresholds and progress should move server-side so they can be tracked historically.

**No global state manager**
The app uses `useState` / `useEffect` only. `userData` is stored in `App.js` and passed as props. This is intentional for now — the app scope doesn't justify introducing Redux or Zustand. If cross-screen shared state grows (e.g. real-time task updates, notifications), React Query or Zustand would be the right addition.

**`ResetPassword` always registered**
The screen is mounted outside both the `isLoggedIn` and `!isLoggedIn` conditional blocks so that the deep link `todoapp://reset-password` reaches the screen regardless of the user's current auth state.

**`due_date` stored as a string**
Tasks store `due_date` as `String?` in Prisma (format: `YYYY-MM-DD`). This avoids timezone conversion issues that come with `DateTime` fields and makes date comparison trivial (string comparison works correctly for ISO dates).

---

## Future Improvements

- **React Query or SWR** — replace per-screen fetch with a shared cache; eliminates redundant requests when switching tabs
- **Backend-driven achievements** — track milestones server-side so they persist across devices and accumulate historically
- **Push notifications** — remind users of overdue tasks or upcoming due dates
- **Optimistic updates** — mark tasks complete locally before the API responds for instant feedback
- **Offline support** — queue mutations when offline and sync on reconnect
- **Analytics dashboard** — weekly/monthly completion graphs, heatmap of active days
- **Profile customization** — avatar upload, theme color preference
- **Recurring tasks** — define a repeat schedule (daily, weekly, etc.)
- **Task reordering** — drag-and-drop to manually prioritize within sections
- **Shared tasks** — assign tasks to other users or collaborate on a task list

---

## Known Limitations

- **Render cold starts** — the Node backend is hosted on Render's free tier; the first request after inactivity can take 20–30 seconds
- **No token refresh** — JWTs expire after 7 days with no silent refresh; users are logged out and must re-authenticate
- **Achievements are ephemeral** — computed on every profile screen load from the current task list; resetting tasks resets badges
- **Categories are global** — `task_categories` is a shared table (seeded with Work, Personal, Shopping, Entertainment); users cannot create their own categories yet
- **No email verification** — accounts are active immediately after registration
- **Single device** — no cross-device sync beyond what the backend provides (the JWT is stored in AsyncStorage, which is device-local)
