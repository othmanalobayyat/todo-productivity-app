-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_subtasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT '0',
    "created_at" DATETIME,
    "updated_at" DATETIME,
    CONSTRAINT "subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_subtasks" ("completed", "created_at", "id", "task_id", "title", "updated_at") SELECT "completed", "created_at", "id", "task_id", "title", "updated_at" FROM "subtasks";
DROP TABLE "subtasks";
ALTER TABLE "new_subtasks" RENAME TO "subtasks";
CREATE TABLE "new_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT '0',
    "completed_at" DATETIME,
    "due_date" TEXT,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    CONSTRAINT "tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "task_categories" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_tasks" ("category_id", "completed", "completed_at", "created_at", "description", "due_date", "id", "priority", "title", "updated_at", "user_id") SELECT "category_id", "completed", "completed_at", "created_at", "description", "due_date", "id", "priority", "title", "updated_at", "user_id" FROM "tasks";
DROP TABLE "tasks";
ALTER TABLE "new_tasks" RENAME TO "tasks";
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" DATETIME,
    "password" TEXT NOT NULL,
    "remember_token" TEXT,
    "created_at" DATETIME,
    "updated_at" DATETIME,
    "is_admin" BOOLEAN NOT NULL DEFAULT '0'
);
INSERT INTO "new_users" ("created_at", "email", "email_verified_at", "id", "is_admin", "name", "password", "remember_token", "updated_at") SELECT "created_at", "email", "email_verified_at", "id", "is_admin", "name", "password", "remember_token", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_unique" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
