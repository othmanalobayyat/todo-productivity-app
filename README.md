# Todo Productivity App

A full-stack mobile productivity app that helps users build consistent habits through task management, smart insights, and daily streak tracking.

> **Note:** Originally developed as part of a university course (_Web & Mobile Development 2_) with a teammate. I continued building it independently after the course, adding the streak system, smart insights, calendar view, subtasks, and more.

---

## ✨ Highlights

- **Daily streak system** — stay consistent with a streak that tracks days you completed tasks
- **Smart insights** — context-aware messages that surface overdue work, high-priority items, and wins
- **Clean mobile UX** — minimal design, fully clickable cards, smooth navigation
- **Dual backend support** — run Laravel or Node.js interchangeably with no frontend changes

---

## 🔄 Dual Backend Architecture

Both backends implement the same API contract (same endpoints and response structure), allowing seamless switching without frontend changes. Switch backends by changing one environment variable. This was a deliberate design choice to keep the frontend decoupled and the stack flexible.

---

## Features

### Task Management

- Create, edit, and delete tasks
- Set priority (low / medium / high)
- Assign due dates and categories
- Filter by status (all / pending / completed) and sort by priority or due date
- Fully clickable task cards for fast navigation

### Smart Insights

- A dynamic message at the top of the tasks screen surfaces what needs attention — overdue tasks, high-priority items, tasks due today, or an all-clear when everything's done.
- Driven by real task state, not static copy.

### Streak System

- Tracks consecutive days where at least one task was completed.
- Uses the `completed_at` timestamp stored on each task.
- Accounts for local device time so midnight doesn't reset a streak mid-session.

### Calendar View

- Visual calendar with marked dates for tasks that have due dates.
- Tap any date to see the tasks due on that day.

### Subtasks

- Each task can have multiple subtasks.
- Add, complete, and delete subtasks from the task detail screen.

### Profile & Auth

- Register / login with token-based authentication.
- Edit profile name and view account details.
- "About Developer" section built into the profile screen.

---

## Tech Stack

Built with a production-style architecture supporting dual backends and a shared API contract.

| Layer             | Technology                                  |
| ----------------- | ------------------------------------------- |
| Frontend          | React Native, Expo ~54, React Navigation v7 |
| UI components     | React Native Paper, Vector Icons, Calendars |
| HTTP client       | Axios                                       |
| Local storage     | AsyncStorage                                |
| Backend (primary) | Laravel 11, PHP 8.2+, Laravel Sanctum       |
| Backend (alt)     | Node.js, Express 5, Prisma ORM, JWT         |
| Database          | SQLite (dev) / MySQL (production)           |

---

## Screens

| Screen                 | What it does                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| **Tasks**              | Main hub — lists tasks with live insight message and streak counter |
| **Task Detail**        | Full task view with subtask management                              |
| **Create / Edit Task** | Form with title, description, priority, due date, and category      |
| **Calendar**           | Date picker with task dots; tap a date to filter tasks              |
| **Profile**            | Account info, edit profile, logout                                  |

---

## How It Works

```
React Native (Expo)
       │
       │  Axios (token in header)
       ▼
REST API  ──────┬──── Laravel (Sanctum auth)
                └──── Node.js / Express (JWT auth)
                            │
                            ▼
                     SQLite / MySQL
```

The frontend connects to whichever backend is running — switch by updating `EXPO_PUBLIC_API_BASE_URL` in `.env`. Both backends expose the same API surface.

---

## Smart Features — Under the Hood

### Insights

Each time the tasks screen loads, it computes:

- **Overdue** — incomplete tasks with a past due date
- **Due today** — incomplete tasks due on the current local date
- **High priority pending** — incomplete tasks with `priority = "high"`

The insight message prioritises urgency: overdue → high priority → due today → all done → general encouragement.

### Streak

The streak counter walks backwards from today (or yesterday, if nothing's been completed today yet) through the `completed_at` dates on tasks. Each consecutive day with at least one completion adds 1. The count stops at the first gap.

All date comparisons use the device's local clock, not UTC, so the streak never breaks at midnight due to a timezone offset.

---

## Setup

### Prerequisites

- PHP 8.2+ and Composer
- Node.js 18+
- Expo Go app on your device (or Android/iOS emulator)

---

### Laravel Backend

```bash
cd to-do-app-backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
# Run the completed_at migration if not included above:
# php artisan migrate --path=database/migrations/2026_04_19_000000_add_completed_at_to_tasks_table.php
php artisan serve
```

API available at `http://127.0.0.1:8000`.

---

### Node.js Backend

```bash
cd to-do-app-backend-node
npm install
cp .env.example .env   # set JWT_SECRET and DATABASE_URL
npx prisma generate
npx prisma db push
npm start
```

API available at `http://localhost:3000`.

---

### Frontend

```bash
cd to-do-app-frontend
npm install
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to your backend's local IP, e.g.:
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:8000/api
npx expo start
```

Scan the QR code with Expo Go, or press `a` / `i` for an emulator.

> Use your machine's local IP (not `localhost`) when testing on a physical device.

---

## Environment Variables

**Laravel** — `to-do-app-backend/.env`

| Variable        | Description                       |
| --------------- | --------------------------------- |
| `APP_KEY`       | Run `php artisan key:generate`    |
| `DB_CONNECTION` | `sqlite` or `mysql`               |
| `DB_DATABASE`   | Database name or SQLite file path |

**Node.js** — `to-do-app-backend-node/.env`

| Variable       | Description                         |
| -------------- | ----------------------------------- |
| `DATABASE_URL` | Prisma DB URL, e.g. `file:./dev.db` |
| `JWT_SECRET`   | Secret for signing JWT tokens       |
| `PORT`         | Server port (default `3000`)        |

**Frontend** — `to-do-app-frontend/.env`

| Variable                   | Description                        |
| -------------------------- | ---------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` | Full URL of the active backend API |

---

## Notes

- Minimal UI philosophy — no clutter, just what you need to get things done.
- Date handling uses local device time throughout to avoid timezone-related bugs.
- Both backends are fully interchangeable — same frontend, same API contract.
