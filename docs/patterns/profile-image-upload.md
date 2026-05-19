# Profile Image Upload — React Native Engineering Pattern

**Category:** Media / User Profile  
**Stack:** React Native (Expo), Node.js/Express, Cloudinary CDN, MongoDB  
**Last reviewed:** 2026-05-19

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Upload Flow](#upload-flow)
3. [Layer-by-Layer Breakdown](#layer-by-layer-breakdown)
4. [Reusable React Native Patterns](#reusable-react-native-patterns)
5. [Best Practices](#best-practices)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
7. [Scalability Considerations](#scalability-considerations)
8. [Security Model](#security-model)
9. [Recommended Improvements](#recommended-improvements)
10. [Generalized Implementation Strategy](#generalized-implementation-strategy)

---

# Adaptation Rules

This document is a reusable engineering reference, NOT a strict implementation template.

The goal is to extract engineering principles and architectural patterns — not to reproduce the exact same implementation across projects.

This document describes engineering concepts and decision-making patterns.

Implementation details shown in examples are illustrative only and must not be treated as mandatory architecture requirements for other project

Every project may differ in:

- backend architecture
- database schema
- authentication system
- storage provider
- state management
- infrastructure maturity
- API contracts
- deployment environment

When applying these patterns to another project:

- adapt the principles to the current architecture
- preserve existing systems whenever possible
- avoid unnecessary database or backend rewrites
- avoid changing API contracts unless required
- avoid large-scale refactors
- implement incrementally in small safe steps
- identify missing infrastructure before implementation
- recommend setup steps instead of assuming infrastructure already exists

Examples of missing infrastructure:

- no media storage provider configured yet
- no avatar field in the database
- no authenticated profile endpoint
- no upload service
- different auth architecture
- different state management solution

In these cases:

- explain what is missing
- recommend minimal compatible integration
- ask for approval before architectural changes

The safest implementation is usually the smallest compatible implementati

## Architecture Overview

The fundamental architectural decision is: **upload directly from the client to a CDN; never relay binary data through your application server.**

```
┌─────────────┐     1. pick image      ┌───────────────┐
│             │ ─────────────────────► │  Device Photo  │
│  Mobile App │ ◄─────────────────────  │    Library    │
│             │     local file URI     └───────────────┘
│             │
│             │     2. POST FormData   ┌───────────────┐
│             │ ─────────────────────► │  Cloudinary   │
│             │ ◄─────────────────────  │     CDN       │
│             │     secure_url         └───────────────┘
│             │
│             │     3. PUT { avatar }  ┌───────────────┐
│             │ ─────────────────────► │  App Server   │
│             │ ◄─────────────────────  │  (Node.js)    │
│             │     updated user obj   └───────┬───────┘
└─────────────┘                               │
       │                                      │ 4. store URL
       │ 5. persist to                ┌───────▼───────┐
       │    AsyncStorage              │   MongoDB     │
       └──────────────────────────── │  User.avatar  │
                                     └───────────────┘
```

**Key insight:** The application server stores only a URL string (≤ 200 bytes). It never handles binary data, never needs `multer`, and never touches the CDN infrastructure. Images are stored and served entirely by the CDN. This keeps your server lean, eliminates an entire class of infrastructure problems, and lets the CDN handle caching and global delivery.

---

## Upload Flow

### Step 1 — Image Pick

```
User taps avatar
    → ImagePicker.launchImageLibraryAsync({
          mediaTypes: Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7
      })
    → returns local file URI (string) or null if user canceled
```

`quality: 0.7` compresses at the OS level before returning the URI. This is preferable to post-processing the image in JavaScript — it's faster, uses less memory, and produces the same result.

`allowsEditing: true` gives the user a built-in crop step. Combined with `aspect: [1, 1]` this guarantees a square image, which is essential for circular avatar display.

### Step 2 — CDN Upload

```
FormData {
    file: { uri, type: "image/jpeg", name: "avatar.jpg" },
    upload_preset: "user_avatar"
}
    → POST https://api.cloudinary.com/v1_1/{cloud}/image/upload
    → returns { secure_url: "https://res.cloudinary.com/..." }
```

The upload preset (`upload_preset`) is a Cloudinary-side configuration that allows unsigned (unauthenticated) uploads. This is the standard model for client-side avatar uploads. No API secret is exposed on the client.

### Step 3 — Server Profile Update

```
PUT /auth/update-profile
Headers: Authorization: Bearer <JWT>
Body: { name, email, avatar: "https://res.cloudinary.com/..." }

Server:
    → verify JWT (extract user ID)
    → validate email uniqueness (exclude current user)
    → User.findByIdAndUpdate(id, { name, email, avatar })
    → return updated user object
```

Identity comes from the JWT, never from the request body. The `avatar` field in the body is just a URL string — the server validates the request came from the right user, not where the image is hosted.

### Step 4 — State & Persistence Sync

```
On server success:
    setUser(data.user)                              ← React state (immediate re-render)
    AsyncStorage.setItem("userInfo", JSON.stringify(data.user))  ← disk cache
```

Both updates happen in the same function, in sequence. Either both succeed or neither does (if the fetch throws, neither line runs). This keeps in-memory state and on-disk cache consistent without explicit transactions.

---

## Layer-by-Layer Breakdown

### Utility Layer (`utils/mediaUpload.js`)

Owns device I/O and CDN I/O. Two functions, cleanly separated:

```js
// Pick from library — pure device I/O
export async function pickImageFromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets[0].uri;
}

// Upload to CDN — pure network I/O
export async function uploadImageToCDN(uri) {
  const data = new FormData();
  data.append("file", { uri, type: "image/jpeg", name: "upload.jpg" });
  data.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(CDN_ENDPOINT, { method: "POST", body: data });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Upload failed");
  return json.secure_url;
}
```

They are co-located because they are always used together, but kept as separate exports so each can be tested or mocked independently.

### Context Layer (`hooks/AuthContext.js`)

Owns all API communication and state management for the user object. The `updateProfile` function is the single point of mutation for user data:

```js
const updateProfile = async (name, email, avatar) => {
  const res = await fetch(`${API_BASE}/auth/update-profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, email, avatar }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Update failed");

  setUser(data.user);
  await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));
};
```

The optional `avatar` parameter uses the server-side `undefined` guard: if `avatar` is `undefined`, the server excludes it from the MongoDB update. This lets one function handle both "update name/email only" and "update avatar only" without separate endpoints.

### Screen Layer (`screens/Account.js`)

The screen is the orchestrator. It calls utility functions and context methods in sequence and handles user-visible outcomes (success alert, error alert):

```js
const handleChangeAvatar = async () => {
  try {
    const uri = await pickImageFromLibrary();
    if (!uri) return; // user canceled — silent no-op

    const avatarUrl = await uploadImageToCDN(uri);
    await updateProfile(user.name, user.email, avatarUrl);
    Alert.alert(t("success"), t("avatarUpdated"));
  } catch (e) {
    Alert.alert(t("error"), e.message || t("avatarUpdateFailed"));
  }
};
```

All async steps propagate errors upward via `throw`, so the catch block is the single place that handles failure for the entire sequence. This keeps error handling from being scattered across layers.

### Server Layer (`routes/authRoutes.js`)

The server endpoint accepts a URL string, validates identity via JWT, and persists to MongoDB. It has no knowledge of Cloudinary or how the URL was produced:

```js
router.put("/update-profile", auth, async (req, res) => {
  const { name, email, avatar } = req.body;

  const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
  if (existing) return res.status(400).json({ message: "Email already used" });

  const update = { name, email };
  if (avatar !== undefined) update.avatar = avatar; // optional field pattern

  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
  res.json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
    },
  });
});
```

### Database Layer (`models/User.js`)

The avatar field is a nullable string — just a URL:

```js
avatar: { type: String, default: null }
```

No format enforcement at schema level (the server accepts any string). URL format validation belongs at the API boundary, not the schema.

---

## Reusable React Native Patterns

### Pattern 1: Utility Module Shape for Media Operations

Group pick + upload in one module, keep them as separate exports:

```
utils/
  mediaUpload.js      pickImageFromLibrary(), uploadToCDN()
  mediaCapture.js     takePhoto(), uploadToCDN()   (same upload, different pick)
```

This allows you to swap pick sources (library vs. camera) while reusing the same upload function. The upload function only needs a URI — it doesn't care how the URI was obtained.

### Pattern 2: Context-Level Atomic State + Persistence

Every mutation in a context provider should follow this contract:

```
1. fetch()                     → network call
2. check res.ok, throw if not  → fail loudly
3. setXxx(data.field)          → update memory state
4. AsyncStorage.setItem(...)   → update disk cache
```

Steps 3 and 4 must always happen together, in that order. If the fetch throws, neither runs. This gives you consistent state across app restarts without explicit transactions.

### Pattern 3: Optional Field Partial Update

When a single endpoint handles multiple optional fields:

```js
// Server side
const update = { requiredField };
if (optionalField !== undefined) update.optionalField = optionalField;
await Model.findByIdAndUpdate(id, update, { new: true });
```

```js
// Client side — only avatar changed
await updateProfile(user.name, user.email, newAvatarUrl);

// Client side — only name changed, no avatar argument
await updateProfile(newName, user.email); // avatar is undefined → excluded
```

This pattern avoids creating separate endpoints for every combination of optional fields. Use `undefined` (absent) to mean "no change", and `null` to mean "clear this field". Never overload their meanings.

### Pattern 4: Fallback URI for Unset Media

```jsx
<Image
  source={{ uri: user?.avatar || DEFAULT_AVATAR_URL }}
  style={styles.avatar}
/>
```

Use a CDN-hosted fallback image rather than a local asset. This keeps bundle size small and the fallback is cached by the CDN just like a real avatar. The `?.` optional chain handles `null` user state during initial load.

### Pattern 5: Single Catch Block for Sequential Async Operations

When multiple async steps must all succeed for the operation to be meaningful, let each step throw on failure and catch everything at the top:

```js
const handleAction = async () => {
  try {
    const a = await stepOne();
    if (!a) return; // intentional exit, not a failure
    const b = await stepTwo(a);
    await stepThree(b);
    notifySuccess();
  } catch (e) {
    notifyFailure(e.message);
  }
};
```

This avoids nested try/catch blocks and keeps the happy path readable. Errors propagate naturally through the await chain.

### Pattern 6: Identity from JWT, Never from Request Body

On the server, always extract the acting user's identity from the verified JWT token, never from the request body:

```js
// Correct
const userId = req.user.id; // from JWT middleware

// Dangerous — allows any authenticated user to modify any other user
const { userId } = req.body;
```

This one rule prevents the entire class of "horizontal privilege escalation" bugs where user A modifies user B's data by including user B's ID in a request.

---

## Best Practices

### Image Picking

- Always set `aspect` when picking for a defined display shape (avatars: `[1,1]`, cover photos: `[16,9]`).
- `quality: 0.6–0.8` is the right range for avatars. Below 0.5 produces visible JPEG artifacts. Above 0.8 adds file size without visible improvement on mobile screens.
- `allowsEditing: true` gives users a built-in crop step. Prefer this over building your own crop UI for standard shapes.
- Handle the `canceled` result as a no-op, not an error. The user is allowed to change their mind.

### CDN Upload

- Upload directly from the client to the CDN — never relay binary through your application server.
- Use an unsigned upload preset for avatars. The risk (anyone can upload to your account) is low and the benefit (no server-side credential required) is high.
- Use a deterministic `public_id` (e.g., `avatars/user_${userId}`) so each user always overwrites the same slot. This prevents orphan image accumulation.
- Validate file size before uploading. Abort if the selected image exceeds a reasonable limit (5MB for avatars) and show the user a message.
- Check `res.ok` before reading `res.json()`. The Cloudinary API returns error details in the JSON body, but only if you handle the error response correctly.

### Server

- Accept only the URL string, not binary data.
- Validate that the avatar value is a valid HTTPS URL before writing to the database.
- Return the complete updated user object from the update endpoint. Clients should never need to fetch the user separately after an update.
- Exclude the avatar URL from the JWT payload. Avatar URLs change; forcing a token refresh on every avatar change is unnecessary friction.

### State Management

- Persist the avatar URL as part of the user object in AsyncStorage. It's a short string and the natural place for it.
- On successful upload, update both in-memory state and AsyncStorage in the same function call, in sequence.
- Design the context mutation API to throw on failure so callers can use try/catch naturally.

### UI Feedback

- Show a loading indicator on the avatar element during the upload. The full round-trip (pick → CDN → server) can take 2–8 seconds on a mobile connection.
- Disable the tap target while uploading to prevent duplicate uploads.
- Show the locally picked image immediately (optimistic preview) rather than waiting for the CDN URL.
- Provide a clear success confirmation (Alert or toast) so the user knows the change was saved, not just displayed locally.

---

## Anti-Patterns to Avoid

### 1. Server as Image Relay

```
// Wrong: device → your server → CDN
// Costs you: bandwidth, memory, CPU, multipart handling middleware
// Right: device → CDN directly; server stores URL
```

Routing binary data through your application server doubles bandwidth costs, requires memory buffers, adds latency, and forces you to manage file storage infrastructure. For user-generated media, there is almost never a reason to do this.

### 2. Storing Binary in the Database

```js
// Wrong
avatar: {
  type: Buffer;
} // BLOB in MongoDB

// Right
avatar: {
  type: String;
} // CDN URL
```

Document databases are not file stores. BLOBs in MongoDB inflate document size, hurt query performance, and make backup and restore expensive.

### 3. Embedding CDN URLs in JWT Tokens

```js
// Wrong — forces token refresh on every avatar change
jwt.sign({ id, email, avatar: user.avatar }, secret);

// Right — token carries only stable identity
jwt.sign({ id, email }, secret);
```

JWTs are not a state sync mechanism. Embed only the fields that identify the user, not their mutable profile data.

### 4. Hardcoding CDN Credentials in Source

```js
// Wrong
const CLOUD_NAME = "dda16ge2b";
const UPLOAD_PRESET = "user_avatar";

// Right
const CLOUD_NAME = Constants.expoConfig.extra.cloudinaryCloud;
const UPLOAD_PRESET = Constants.expoConfig.extra.cloudinaryPreset;
```

Even non-secret credentials (upload presets) should live in environment config, not source code. This enables switching environments and avoids credential sprawl across the codebase.

### 5. No Loading State During Upload

Triggering an async operation with no visible feedback is always wrong. The user has no way to know if their tap registered, if the upload is in progress, or if something failed silently.

### 6. Pessimistic UI for Media Updates

Waiting for server confirmation before showing the new image creates a frustrating experience. Show the locally picked URI immediately, confirm with the CDN URL when it arrives, and rollback only on failure. Users perceive this as instant.

### 7. Ignoring Old Image Cleanup

Every avatar change without a cleanup strategy produces an orphan image on the CDN. At scale, this accumulates into real storage costs. Use a deterministic `public_id` and overwrite, or implement a deletion step.

### 8. Accepting `null` and `undefined` as "No Change" Interchangeably

```js
// Ambiguous — does null mean "clear avatar" or "don't update avatar"?
if (avatar !== null) update.avatar = avatar;

// Clear semantics:
// undefined = caller didn't provide this field → skip it
// null      = caller explicitly wants to clear the field → include it
if (avatar !== undefined) update.avatar = avatar;
```

### 9. Coupling Partial Updates to Full Object Parameters

```js
// Fragile — caller must always supply name and email even when only avatar changed
// Risk: stale values from race conditions overwrite recent changes
await updateProfile(user.name, user.email, newAvatarUrl);

// Better — pass only what you're changing
await updateProfile({ avatar: newAvatarUrl });
```

---

## Scalability Considerations

| Concern                          | Small Scale                     | At Scale                                              | Solution                                                       |
| -------------------------------- | ------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Image storage                    | CDN free tier                   | Storage costs grow with users                         | Deterministic `public_id` + overwrite; delete on change        |
| Image delivery                   | CDN handles it                  | No action needed                                      | CDN is already the right architecture                          |
| Old image orphans                | Invisible                       | Real cost at thousands of users                       | Overwrite strategy or deletion queue                           |
| Avatar URL in AsyncStorage       | Works fine                      | Works fine — URLs are short strings                   | No change needed                                               |
| Multi-device sync                | Not handled                     | User changes avatar on web; mobile shows stale avatar | Refetch user profile on app foreground                         |
| Image quality variants           | Single upload                   | Mobile needs thumbnails; web needs full-size          | Cloudinary URL transformations (append `/c_fill,w_150,h_150/`) |
| Upload failures on slow networks | Error + retry manually          | High failure rate in poor connectivity markets        | Upload with retry logic; queue failed uploads                  |
| Concurrent uploads               | Not possible (no loading state) | Duplicate uploads possible if tap is fast             | Disable tap during in-flight upload                            |

### CDN URL Transformations (Cloudinary)

Cloudinary supports on-the-fly image transformations via URL parameters. Rather than uploading multiple sizes, upload once and derive sizes at display time:

```
Original:  https://res.cloudinary.com/cloud/image/upload/v1/avatars/user_123.jpg
150×150:   https://res.cloudinary.com/cloud/image/upload/c_fill,w_150,h_150/avatars/user_123.jpg
40×40:     https://res.cloudinary.com/cloud/image/upload/c_fill,w_40,h_40/avatars/user_123.jpg
```

Store the base URL; derive display variants in the component. This means a single upload serves every context.

---

## Security Model

### What is Safe

- **Identity from JWT:** User ID is extracted from the verified JWT token by middleware, never from the request body. A user cannot modify another user's avatar.
- **URL-only storage:** The database stores a URL string. No binary data means no binary injection vectors.
- **Unsigned upload preset:** Upload-only access to one Cloudinary account. Cannot read, delete, or access other accounts.
- **Bearer token required:** The update endpoint is gated by JWT auth middleware. Unauthenticated requests receive 401.

### Known Accepted Risks

- **Unsigned upload preset discovery:** Anyone who finds `CLOUD_NAME + UPLOAD_PRESET` can upload images to your Cloudinary account. Mitigate with: upload limits in Cloudinary preset config, and monitoring for unusual upload volume.
- **No avatar URL validation on server:** The server accepts any string as `avatar`. A crafted request could store a non-image URL. For an avatar displayed in a native `Image` component this is low risk, but a URL validator on the server is the correct defense.

### Recommended Server-Side Validation

```js
const VALID_AVATAR_URL = /^https:\/\/res\.cloudinary\.com\/.+/;

if (avatar !== undefined) {
  if (typeof avatar !== "string" || !VALID_AVATAR_URL.test(avatar)) {
    return res.status(400).json({ message: "Invalid avatar URL" });
  }
  update.avatar = avatar;
}
```

---

## Recommended Improvements

These are ordered by impact-to-effort ratio.

### 1. Add Upload Loading State (High impact, Low effort)

```js
// In the screen component
const [uploading, setUploading] = useState(false);

const handleChangeAvatar = async () => {
  setUploading(true);
  try {
    const uri = await pickImageFromLibrary();
    if (!uri) return;
    const url = await uploadImageToCDN(uri);
    await updateProfile(user.name, user.email, url);
    Alert.alert(t("success"), t("avatarUpdated"));
  } catch (e) {
    Alert.alert(t("error"), e.message);
  } finally {
    setUploading(false);
  }
};

// In JSX
<TouchableOpacity onPress={handleChangeAvatar} disabled={uploading}>
  <Image source={{ uri: displayAvatar }} style={styles.avatar} />
  {uploading && (
    <View style={[StyleSheet.absoluteFill, styles.uploadOverlay]}>
      <ActivityIndicator color="#fff" />
    </View>
  )}
</TouchableOpacity>;
```

### 2. Add Optimistic UI Preview (High impact, Low effort)

```js
const [localPreview, setLocalPreview] = useState(null);

const handleChangeAvatar = async () => {
  const uri = await pickImageFromLibrary();
  if (!uri) return;

  setLocalPreview(uri); // show new image immediately
  setUploading(true);
  try {
    const url = await uploadImageToCDN(uri);
    await updateProfile(user.name, user.email, url);
  } catch (e) {
    setLocalPreview(null); // rollback on failure
    Alert.alert(t("error"), e.message);
  } finally {
    setUploading(false);
  }
};

const displayAvatar = localPreview || user?.avatar || DEFAULT_AVATAR;
```

### 3. Deterministic CDN Public ID (Medium impact, Low effort)

```js
// In the upload function — overwrite instead of creating a new file
data.append("public_id", `avatars/user_${userId}`);
data.append("overwrite", "true");
```

This eliminates orphan image accumulation and keeps Cloudinary storage bounded per user.

### 4. File Size Validation Before Upload (Medium impact, Low effort)

```js
// After getting the URI, before uploading
import * as FileSystem from "expo-file-system";

const info = await FileSystem.getInfoAsync(uri);
if (info.size > 5 * 1024 * 1024) {
  throw new Error(t("imageTooLarge"));
}
```

### 5. Move Credentials to Environment Config (Low impact for security, Medium effort)

```js
// app.config.js
extra: {
  cloudinaryCloud: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
}

// utils/mediaUpload.js
import Constants from "expo-constants";
const { cloudinaryCloud, cloudinaryPreset } = Constants.expoConfig.extra;
```

### 6. Refetch Profile on App Foreground (Addresses multi-device sync)

```js
// In AuthContext or a top-level component
import { AppState } from "react-native";

useEffect(() => {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active" && token) {
      refreshProfile(); // GET /auth/me → setUser + AsyncStorage
    }
  });
  return () => sub.remove();
}, [token]);
```

### 7. Avatar URL Validation on Server

```js
// authRoutes.js — add before update
const CLOUDINARY_URL = /^https:\/\/res\.cloudinary\.com\/.+/;
if (avatar !== undefined && !CLOUDINARY_URL.test(avatar)) {
  return res.status(400).json({ message: "Invalid avatar URL" });
}
```

## Safe AI Implementation Workflow

Before implementing this pattern in a different project:

1. Analyze the existing architecture first
2. Identify what infrastructure already exists
3. Identify what is missing
4. Compare the project against the engineering principles
5. Create a minimal integration plan
   5.5 Create an implementation proposal before modifying files

The proposal should:

- explain what changes are actually necessary
- explain what infrastructure is missing
- explain what should NOT be changed
- separate optional improvements from required changes
- minimize architectural disrupt

6. Separate safe changes from risky architectural changes
7. Preserve backward compatibility whenever possible
8. Avoid modifying unrelated systems
9. Ask for approval before:
   - database schema changes
   - API contract changes
   - auth system modifications
   - large refactors
10. Prefer incremental implementation over full rewrites

Goal:
Adapt the engineering principles intelligently to the target project instead of reproducing the original syst

---

## Generalized Implementation Strategy

Use this checklist when implementing a profile image upload feature in any React Native app:

```
ARCHITECTURE
  [ ] Upload directly to CDN from client — never relay binary through your server
  [ ] Server stores URL string only
  [ ] Identity validation via JWT, never via body parameter
  [ ] Avatar URL excluded from JWT payload

PICK STEP
  [ ] Use expo-image-picker (Expo) or react-native-image-picker (bare RN)
  [ ] Set appropriate aspect ratio for the display context
  [ ] Set quality 0.6–0.8 (OS-level compression)
  [ ] Enable allowsEditing for user crop step
  [ ] Handle canceled result as a silent no-op

UPLOAD STEP
  [ ] Use unsigned upload preset for client-side CDN upload
  [ ] Use deterministic public_id to overwrite old images
  [ ] Validate file size before upload (abort > 5MB)
  [ ] Check res.ok before reading response JSON
  [ ] Throw meaningful errors that the caller can display

STATE STEP
  [ ] Add loading boolean to the screen component
  [ ] Show optimistic local preview before upload completes
  [ ] Rollback optimistic preview on failure
  [ ] Disable tap during in-flight upload
  [ ] Update both in-memory context state AND AsyncStorage atomically on success

SERVER STEP
  [ ] Accept URL string only, not binary
  [ ] Validate avatar value is a valid HTTPS URL
  [ ] Use optional field pattern (undefined = skip, null = clear)
  [ ] Return full updated user object from the endpoint
  [ ] Gate the endpoint with JWT auth middleware

FEEDBACK
  [ ] Loading indicator on the avatar element during upload
  [ ] Success confirmation (Alert or toast) after completion
  [ ] Error message from the thrown error (propagate through layers)
```
