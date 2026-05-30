# Environment Variables Setup

Configure both primary and fallback backends for your React Native app.

---

## Local Development (.env file)

**File:** `to-do-app-frontend/.env`

```bash
# Primary backend (Render) - Your current backend
EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api

# Fallback backend (Fly.io) - Backup for when Render fails
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api
```

### How to set:

```bash
cd to-do-app-frontend

# Create .env file if it doesn't exist
cat > .env << EOF
EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api
EOF

# Or edit existing .env and add the fallback URL
```

### Verify:

```bash
cat .env
# Should show both URLs
```

---

## Production Deployment (EAS/Expo)

### Option A: Hardcode in app.json (Simple)

**File:** `to-do-app-frontend/app.json`

```json
{
  "expo": {
    "name": "to-do-app",
    "slug": "to-do-app",
    "version": "1.0.0",
    "assetBundlePatterns": ["**/*"],
    "plugins": [],
    "extra": {
      "eas": {
        "projectId": "..."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png"
      }
    },
    "ios": {
      "supportsTabletMode": true
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [],
    "scheme": "todoapp"
  },
  "plugins": []
}
```

Then set environment variables at build time:

```bash
EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api \
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api \
eas build --platform ios --auto-submit

EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api \
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api \
eas build --platform android --auto-submit
```

### Option B: Use eas.json (Recommended)

**File:** `to-do-app-frontend/eas.json`

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://todo-productivity-app-06p4.onrender.com/api",
        "EXPO_PUBLIC_API_FALLBACK_URL": "https://todo-productivity-app.fly.dev/api"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://todo-productivity-app-06p4.onrender.com/api",
        "EXPO_PUBLIC_API_FALLBACK_URL": "https://todo-productivity-app.fly.dev/api"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Then deploy:

```bash
# Uses environment from eas.json "production" section
eas build --platform ios --auto-submit
eas build --platform android --auto-submit
```

---

## Production Deployment (React Native CLI)

If not using Expo/EAS, configure in native code:

### iOS (Info.plist or build settings)

Add to `ios/yourapp/Info.plist`:

```xml
<key>EXPO_PUBLIC_API_BASE_URL</key>
<string>https://todo-productivity-app-06p4.onrender.com/api</string>
<key>EXPO_PUBLIC_API_FALLBACK_URL</key>
<string>https://todo-productivity-app.fly.dev/api</string>
```

### Android (gradle.properties)

Add to `android/gradle.properties`:

```properties
EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api
```

---

## URL Reference

| Environment | Primary (Render)                                      | Fallback (Fly.io)                           |
| ----------- | ----------------------------------------------------- | ------------------------------------------- |
| Local dev   | `http://localhost:3000/api`                           | `http://localhost:3001/api`                 |
| Production  | `https://todo-productivity-app-06p4.onrender.com/api` | `https://todo-productivity-app.fly.dev/api` |

---

## Testing Environment Variables

### Verify variables are set:

```bash
# In your app code, add this temporarily:
import { API_BASE_URL, API_FALLBACK_URL } from './src/config';

console.log('Primary:', API_BASE_URL);
console.log('Fallback:', API_FALLBACK_URL);

// Or in app startup
console.log('EXPO_PUBLIC_API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
console.log('EXPO_PUBLIC_API_FALLBACK_URL:', process.env.EXPO_PUBLIC_API_FALLBACK_URL);
```

### Expected output:

```
Primary: https://todo-productivity-app-06p4.onrender.com/api
Fallback: https://todo-productivity-app.fly.dev/api
```

---

## Troubleshooting

### "EXPO_PUBLIC_API_FALLBACK_URL is undefined"

**Solution:** Add it to `.env` or `eas.json`

```bash
# Local dev
echo "EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api" >> .env

# Production
# Edit eas.json and add to both "preview" and "production" sections
```

### "Fallback not triggering"

**Solution:** Verify variable is set in your build

```bash
# Check what's actually in the built app
# In your app, console.log the values at startup
```

### "Failover returns wrong backend response"

**Solution:** Verify both backends have same data/schema

```bash
# Check Render is live
curl https://todo-productivity-app-06p4.onrender.com/api/ping

# Check Fly.io is live
curl https://todo-productivity-app.fly.dev/api/ping

# Both should return 200
```

---

## Deployment Commands

### With environment variables inline:

```bash
# iOS
EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api \
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api \
eas build --platform ios --auto-submit

# Android
EXPO_PUBLIC_API_BASE_URL=https://todo-productivity-app-06p4.onrender.com/api \
EXPO_PUBLIC_API_FALLBACK_URL=https://todo-productivity-app.fly.dev/api \
eas build --platform android --auto-submit
```

### Using eas.json (preferred):

```bash
# Simply run:
eas build --platform ios --auto-submit
eas build --platform android --auto-submit

# Variables are read from eas.json automatically
```

---

## Next Steps

1. ✅ Set `.env` file locally
2. ✅ Update `eas.json` for production
3. ✅ Import `failoverApi` in your screens
4. ✅ Replace `api` calls with `failoverApi`
5. ✅ Deploy and test

---
