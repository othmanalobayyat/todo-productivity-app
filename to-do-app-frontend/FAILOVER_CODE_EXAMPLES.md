# Failover Implementation: Code Examples

Quick reference for updating screens to use failover API.

---

## 1. LoginScreen.js

**Current code (without failover):**

```javascript
import api from "../services/api";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await api.post("/login", { email, password }); // ← api
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
      // ... rest of login
    } catch (error) {
      Toast.show({ text: "Login failed", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };
}
```

**Updated (with failover):**

```javascript
import failoverApi from "../services/failoverApi"; // ← Add this import

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await failoverApi.post("/login", { email, password }); // ← Change here
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.token);
      // ... rest of login (unchanged)
    } catch (error) {
      Toast.show({ text: "Login failed", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };
}
```

**Changes:**

- Line 1: Import `failoverApi` instead of (or in addition to) `api`
- Line 13: Change `api.post` to `failoverApi.post`
- Everything else: unchanged

---

## 2. RegisterScreen.js

**Current:**

```javascript
const response = await api.post("/register", {
  name,
  email,
  password,
});
```

**Updated:**

```javascript
const response = await failoverApi.post("/register", {
  name,
  email,
  password,
});
```

---

## 3. TasksScreen.js (Fetch Tasks)

**Current:**

```javascript
import api from "../services/api";

useEffect(() => {
  const fetchTasks = async () => {
    try {
      const data = await api.get("/tasks");
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  fetchTasks();
  const unsubscribe = navigation.addListener("focus", fetchTasks);
  return unsubscribe;
}, [navigation]);
```

**Updated:**

```javascript
import failoverApi from "../services/failoverApi"; // ← Add

useEffect(() => {
  const fetchTasks = async () => {
    try {
      const data = await failoverApi.get("/tasks"); // ← Change here
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  fetchTasks();
  const unsubscribe = navigation.addListener("focus", fetchTasks);
  return unsubscribe;
}, [navigation]);
```

---

## 4. CreateTaskScreen.js

**Current:**

```javascript
const handleCreateTask = async () => {
  try {
    const response = await api.post("/tasks", {
      title,
      description,
      priority,
      due_date,
      category_id,
    });
    navigation.goBack();
  } catch (error) {
    setError("Failed to create task");
  }
};
```

**Updated:**

```javascript
const handleCreateTask = async () => {
  try {
    const response = await failoverApi.post("/tasks", {
      // ← Change here
      title,
      description,
      priority,
      due_date,
      category_id,
    });
    navigation.goBack();
  } catch (error) {
    setError("Failed to create task");
  }
};
```

---

## 5. EditTaskScreen.js (Update Task)

**Current:**

```javascript
const handleSaveTask = async () => {
  try {
    await api.put(`/tasks/${taskId}`, {
      title: updatedTitle,
      completed: updatedCompleted,
      priority: updatedPriority,
    });
    navigation.goBack();
  } catch (error) {
    Toast.show({ text: "Update failed" });
  }
};
```

**Updated:**

```javascript
const handleSaveTask = async () => {
  try {
    await failoverApi.put(`/tasks/${taskId}`, {
      // ← Change here
      title: updatedTitle,
      completed: updatedCompleted,
      priority: updatedPriority,
    });
    navigation.goBack();
  } catch (error) {
    Toast.show({ text: "Update failed" });
  }
};
```

---

## 6. Task Completion (Mark Complete/Incomplete)

**Current:**

```javascript
const markAsComplete = async (taskId) => {
  try {
    await api.put(`/tasks/${taskId}`, { completed: true });
    // Refetch or update local state
  } catch (error) {
    console.error("Failed to complete task:", error);
  }
};
```

**Updated:**

```javascript
const markAsComplete = async (taskId) => {
  try {
    await failoverApi.put(`/tasks/${taskId}`, { completed: true }); // ← Change
    // Refetch or update local state
  } catch (error) {
    console.error("Failed to complete task:", error);
  }
};
```

---

## 7. Delete Task

**Current:**

```javascript
const handleDeleteTask = async (taskId) => {
  try {
    await api.delete(`/tasks/${taskId}`);
    setTasks(tasks.filter((t) => t.id !== taskId));
  } catch (error) {
    Toast.show({ text: "Delete failed" });
  }
};
```

**Updated:**

```javascript
const handleDeleteTask = async (taskId) => {
  try {
    await failoverApi.delete(`/tasks/${taskId}`); // ← Change here
    setTasks(tasks.filter((t) => t.id !== taskId));
  } catch (error) {
    Toast.show({ text: "Delete failed" });
  }
};
```

---

## 8. ProfileScreen.js

**Current:**

```javascript
useEffect(() => {
  const fetchProfile = async () => {
    try {
      const data = await api.get("/profile");
      setUser(data.user);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  fetchProfile();
}, []);
```

**Updated:**

```javascript
useEffect(() => {
  const fetchProfile = async () => {
    try {
      const data = await failoverApi.get("/profile"); // ← Change here
      setUser(data.user);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  fetchProfile();
}, []);
```

---

## 9. EditProfileScreen.js (Update Name/Email)

**Current:**

```javascript
const handleUpdateProfile = async () => {
  try {
    const response = await api.put("/profile", {
      name: newName,
      email: newEmail,
    });
    setUser(response.user);
    Toast.show({ text: "Profile updated" });
  } catch (error) {
    setError("Failed to update profile");
  }
};
```

**Updated:**

```javascript
const handleUpdateProfile = async () => {
  try {
    const response = await failoverApi.put("/profile", {
      // ← Change here
      name: newName,
      email: newEmail,
    });
    setUser(response.user);
    Toast.show({ text: "Profile updated" });
  } catch (error) {
    setError("Failed to update profile");
  }
};
```

---

## 10. ForgotPasswordScreen.js

**Current:**

```javascript
const handleForgotPassword = async () => {
  try {
    await api.post("/forgot-password", { email });
    Toast.show({ text: "Check your email for reset link" });
  } catch (error) {
    setError("Failed to send reset email");
  }
};
```

**Updated:**

```javascript
const handleForgotPassword = async () => {
  try {
    await failoverApi.post("/forgot-password", { email }); // ← Change here
    Toast.show({ text: "Check your email for reset link" });
  } catch (error) {
    setError("Failed to send reset email");
  }
};
```

---

## 11. ResetPasswordScreen.js

**Current:**

```javascript
const handleResetPassword = async () => {
  try {
    const response = await api.post("/reset-password", {
      token,
      email,
      password: newPassword,
    });
    Toast.show({ text: "Password reset successfully" });
    navigation.replace("Login");
  } catch (error) {
    setError("Failed to reset password");
  }
};
```

**Updated:**

```javascript
const handleResetPassword = async () => {
  try {
    const response = await failoverApi.post("/reset-password", {
      // ← Change
      token,
      email,
      password: newPassword,
    });
    Toast.show({ text: "Password reset successfully" });
    navigation.replace("Login");
  } catch (error) {
    setError("Failed to reset password");
  }
};
```

---

## 12. ChangePasswordScreen.js

**Current:**

```javascript
const handleChangePassword = async () => {
  try {
    await api.put("/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    Toast.show({ text: "Password changed successfully" });
  } catch (error) {
    setError("Password change failed");
  }
};
```

**Updated:**

```javascript
const handleChangePassword = async () => {
  try {
    await failoverApi.put("/change-password", {
      // ← Change here
      current_password: currentPassword,
      new_password: newPassword,
    });
    Toast.show({ text: "Password changed successfully" });
  } catch (error) {
    setError("Password change failed");
  }
};
```

---

## 13. Subtasks Operations

**Create subtask (Current):**

```javascript
await api.post(`/subtasks`, {
  task_id: taskId,
  title: subtaskTitle,
});
```

**Create subtask (Updated):**

```javascript
await failoverApi.post(`/subtasks`, {
  // ← Change here
  task_id: taskId,
  title: subtaskTitle,
});
```

**Update subtask (Current):**

```javascript
await api.put(`/subtasks/${subtaskId}`, { completed: true });
```

**Update subtask (Updated):**

```javascript
await failoverApi.put(`/subtasks/${subtaskId}`, { completed: true }); // ← Change
```

**Delete subtask (Current):**

```javascript
await api.delete(`/subtasks/${subtaskId}`);
```

**Delete subtask (Updated):**

```javascript
await failoverApi.delete(`/subtasks/${subtaskId}`); // ← Change here
```

---

## 14. Non-Critical Operations (Keep Using `api`)

These can stay with regular `api` (no failover needed):

```javascript
// Analytics/logging - not critical
await api.post("/analytics/track", { event: "user_opened_app" });

// Optional features
await api.get("/recommendations");

// UI-only requests
await api.get("/metadata");
```

---

## Pattern: Import + Replace

For every file, follow this pattern:

1. **Add import at top:**

   ```javascript
   import failoverApi from "../services/failoverApi";
   ```

2. **Replace `api.` with `failoverApi.`:**

   ```javascript
   // Before:
   await api.post("/endpoint", data);

   // After:
   await failoverApi.post("/endpoint", data);
   ```

That's it! No other changes needed.

---

## Quick Migration Checklist

- [ ] LoginScreen.js
- [ ] RegisterScreen.js
- [ ] TasksScreen.js
- [ ] CreateTaskScreen.js
- [ ] EditTaskScreen.js
- [ ] ProfileScreen.js
- [ ] EditProfileScreen.js
- [ ] ForgotPasswordScreen.js
- [ ] ResetPasswordScreen.js
- [ ] ChangePasswordScreen.js
- [ ] Subtasks (if applicable)

---
