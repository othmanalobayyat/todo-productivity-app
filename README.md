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
  - [Backend (Laravel)](#backend-laravel)
  - [Frontend (React Native / Expo)](#frontend-react-native--expo)
- [Environment Variables](#environment-variables)
- [Pre-publish Checklist](#pre-publish-checklist)

---

## Overview

Todo Productivity App is a mobile-first productivity app that lets users register, log in, and manage their daily tasks. It supports task categories, priorities, subtasks, a dashboard with live insights, and user profiles — all backed by a RESTful Laravel API secured with Laravel Sanctum token authentication.

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React Native, Expo ~54, React Navigation v7     |
| UI        | React Native Paper, Expo Vector Icons           |
| HTTP      | Axios                                           |
| Storage   | AsyncStorage                                    |
| Backend   | Laravel 11, PHP 8.2+                            |
| Auth      | Laravel Sanctum (token-based)                   |
| Database  | MySQL (production) / SQLite (local dev)         |

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
├── to-do-app-backend/        # Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/  # API controllers (Task, Subtask, Category, Auth, Admin...)
│   │   │   ├── Middleware/
│   │   │   └── Requests/
│   │   └── Models/           # Eloquent models (User, Task, Subtask, TaskCategory)
│   ├── database/
│   │   └── migrations/       # All database migrations
│   ├── routes/
│   │   └── api.php           # API route definitions
│   ├── .env.example          # Backend environment template
│   └── composer.json
│
└── to-do-app-frontend/       # React Native (Expo) mobile app
    ├── src/
    │   ├── screens/          # App screens (Login, Register, Tasks, TaskDetails, Profile...)
    │   ├── components/       # Shared UI components (Header, Toast)
    │   ├── services/         # Axios API service layer
    │   └── config.js         # API base URL configuration
    ├── assets/               # Images and fonts
    ├── App.js                # Root component and navigation setup
    ├── .env.example          # Frontend environment template
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

### Backend (Laravel)

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

# 5. Start the development server
php artisan serve
```

The API will be available at `http://127.0.0.1:8000`.

> **For mobile device access:** Replace `127.0.0.1` with your machine's local IP address (e.g. `192.168.1.x`) so your phone can reach the server on the same network.

---

### Frontend (React Native / Expo)

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

### Backend — `to-do-app-backend/.env`

| Variable        | Description                                  |
|-----------------|----------------------------------------------|
| `APP_KEY`       | Laravel application key (generated by artisan) |
| `DB_CONNECTION` | Database driver (`mysql` or `sqlite`)        |
| `DB_HOST`       | Database host                                |
| `DB_PORT`       | Database port (default `3306` for MySQL)     |
| `DB_DATABASE`   | Database name                                |
| `DB_USERNAME`   | Database user                                |
| `DB_PASSWORD`   | Database password                            |

See `to-do-app-backend/.env.example` for the full list of variables.

### Frontend — `to-do-app-frontend/.env`

| Variable                    | Description                              |
|-----------------------------|------------------------------------------|
| `EXPO_PUBLIC_API_BASE_URL`  | Full URL of the Laravel backend API      |

Example:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:8000/api
```

> Use your machine's local IP when testing on a physical device. For an Android emulator use `http://10.0.2.2:8000/api`; for an iOS simulator use `http://localhost:8000/api`.

---

## Pre-publish Checklist

- [ ] Replace placeholder screenshots in the README
- [ ] Verify `to-do-app-backend/.env` is NOT committed (covered by `.gitignore`)
- [ ] Verify `to-do-app-frontend/.env` is NOT committed (covered by `.gitignore`)
- [ ] Remove `database/database.sqlite` from version control if it contains real data
- [ ] Verify `storage/` and `bootstrap/cache/` are excluded by `.gitignore`
- [ ] Add a `LICENSE` file if you wish to open-source the project
- [ ] Consider renaming the repo to something descriptive (e.g. `todo-productivity-app`)
