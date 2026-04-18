# Todo Productivity App

A full-stack mobile productivity application for managing tasks, subtasks, and categories. Built with React Native (Expo) on the frontend and Laravel on the backend.

> **Note:** This project was originally developed as part of a university course (*Web & Mobile Development 2*) in collaboration with a teammate. After the course, I continued improving and extending it independently — adding features like subtasks, task priority, dashboard insights, profile management, and more.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
  - [Backend — Laravel](#backend--laravel)
  - [Backend — Node.js](#backend--nodejs)
  - [Frontend — React Native / Expo](#frontend--react-native--expo)
- [Environment Variables](#environment-variables)
- [Pre-publish Checklist](#pre-publish-checklist)

---

## Overview

Todo Productivity App is a mobile-first productivity app that lets users register, log in, and manage their daily tasks. It supports task categories, priorities, subtasks, a dashboard with live insights, and user profiles — all backed by a RESTful Laravel API secured with Laravel Sanctum token authentication.

---

## Tech Stack

| Layer              | Technology                                      |
|--------------------|-------------------------------------------------|
| Frontend           | React Native, Expo ~54, React Navigation v7     |
| UI                 | React Native Paper, Expo Vector Icons           |
| HTTP               | Axios                                           |
| Storage            | AsyncStorage                                    |
| Backend (primary)  | Laravel 11, PHP 8.2+                            |
| Auth (Laravel)     | Laravel Sanctum (token-based)                   |
| Backend (alt)      | Node.js, Express 5, Prisma ORM                  |
| Auth (Node)        | JWT (jsonwebtoken)                              |
| Database           | SQLite (local dev) / MySQL (production)         |

---

## Features

- User registration and login (token-based authentication)
- Create, edit, and delete tasks
- Assign tasks to custom categories
- Set task priority (low / medium / high)
- Add and manage subtasks with live completion progress tracking
- Dashboard with insights: overdue tasks, due today, and high-priority tasks
- View full task details
- User profile screen
- Admin panel for user management
- Bottom tab navigation
- Toast notifications for feedback

---

## Screenshots

> Screenshots coming soon. Place images in `docs/screenshots/` and reference them here.

| Welcome | Login | Tasks | Task Detail |
|---------|-------|-------|-------------|
| _placeholder_ | _placeholder_ | _placeholder_ | _placeholder_ |

---

## Project Structure

```
to-do-app-workspace/
├── to-do-app-backend/          # Laravel REST API (primary backend)
│   ├── app/
│   │   ├── Http/Controllers/   # Task, Subtask, Category, Auth, Admin...
│   │   └── Models/             # User, Task, Subtask, TaskCategory
│   ├── database/migrations/    # All database migrations
│   ├── routes/api.php          # API route definitions
│   ├── .env.example            # Environment template
│   └── composer.json
│
├── to-do-app-backend-node/     # Node.js REST API (alternative backend)
│   ├── routes/                 # auth, tasks, subtasks, profile, categories
│   ├── middleware/auth.js      # JWT auth middleware
│   ├── prisma/schema.prisma    # Database schema
│   ├── prismaClient.js         # Prisma client singleton
│   ├── index.js                # Express app entry point
│   ├── .env.example            # Environment template
│   └── package.json
│
└── to-do-app-frontend/         # React Native (Expo) mobile app
    ├── src/
    │   ├── screens/            # Login, Register, Tasks, TaskDetails, Profile...
    │   ├── components/         # AppHeader, TaskItem, Toast
    │   ├── services/           # Axios API client + authService
    │   ├── constants/          # priorities, storage keys
    │   └── utils/              # dateUtils
    ├── assets/                 # Images and icons
    ├── App.js                  # Root component and navigation setup
    ├── .env.example            # Environment template
    └── package.json
```

---

## Setup Instructions

### Prerequisites

- PHP 8.2+
- Composer
- Node.js 18+
- MySQL (or use the included SQLite for local dev)
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- A physical device or emulator (Android / iOS)

---

### Backend — Laravel

```bash
cd to-do-app-backend

# 1. Install PHP dependencies
composer install

# 2. Copy and configure environment
cp .env.example .env

# 3. Generate application key
php artisan key:generate

# 4. Configure your database in .env, then run migrations
php artisan migrate

# 5. (Optional) Seed default task categories
php artisan db:seed --class=TaskCategorySeeder

# 6. Start the development server
php artisan serve
```

The API will be available at `http://127.0.0.1:8000`.

> **For mobile device access:** Replace `127.0.0.1` with your machine's local IP (e.g. `192.168.1.x`) so your phone can reach the server on the same network.

---

### Backend — Node.js

The Node.js backend is a drop-in alternative to the Laravel backend and exposes the same REST API surface.

```bash
cd to-do-app-backend-node

# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# 3. Generate the Prisma client and create the SQLite database
npx prisma generate
npx prisma db push

# 4. Start the server
npm start
```

The API will be available at `http://localhost:3000`.

---

### Frontend — React Native / Expo

```bash
cd to-do-app-frontend

# 1. Install dependencies
npm install

# 2. Create a .env file and set your backend URL
cp .env.example .env
# Then edit .env and set:
# EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:8000/api

# 3. Start Expo
npx expo start
```

Scan the QR code with the **Expo Go** app on your device, or press `a` for Android emulator / `i` for iOS simulator.

---

## Environment Variables

### Laravel backend — `to-do-app-backend/.env`

| Variable        | Description                                      |
|-----------------|--------------------------------------------------|
| `APP_KEY`       | Laravel app key — run `php artisan key:generate` |
| `DB_CONNECTION` | Database driver (`mysql` or `sqlite`)            |
| `DB_DATABASE`   | Database name or SQLite file path                |
| `DB_USERNAME`   | Database username                                |
| `DB_PASSWORD`   | Database password                                |

See `to-do-app-backend/.env.example` for the full list.

### Node.js backend — `to-do-app-backend-node/.env`

| Variable       | Description                                    |
|----------------|------------------------------------------------|
| `DATABASE_URL` | Prisma database URL (e.g. `file:./dev.db`)     |
| `JWT_SECRET`   | Secret used to sign JWT tokens                 |
| `PORT`         | Server port (default `3000`)                   |

See `to-do-app-backend-node/.env.example` for the full list.

### Frontend — `to-do-app-frontend/.env`

| Variable                    | Description                              |
|-----------------------------|------------------------------------------|
| `EXPO_PUBLIC_API_BASE_URL`  | Full URL of the active backend API       |

Example:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:8000/api
```

> Use your machine's local IP when testing on a physical device. For an Android emulator use `http://10.0.2.2:8000/api`; for an iOS simulator use `http://localhost:8000/api`.

---

## Pre-publish Checklist

- [ ] Replace placeholder screenshots in the README
- [ ] Verify `.env` files are not committed: `git ls-files | grep '\.env$'` should return nothing
- [ ] Verify `storage/`, `bootstrap/cache/`, and `*.db` files are excluded
- [ ] Add a `LICENSE` file if you wish to open-source the project
- [ ] Consider renaming the GitHub repo to something descriptive (e.g. `todo-productivity-app`)
