var express = require("express");
var Prisma = require("../prismaClient.js");
var authMiddleware = require("../middleware/auth.js");
var router = express.Router();
var { body, validationResult } = require("express-validator");

router.get("/tasks", authMiddleware, async function (req, res) {
  try {
    // Fetch tasks with subtask count
    var tasks = await Prisma.tasks.findMany({
      where: { user_id: req.user.userId },
      include: { _count: { select: { subtasks: true } } },
    });
    var restlt = await Promise.all(
      tasks.map(async function (task) {
        var completedCount = await Prisma.subtasks.count({
          where: { task_id: task.id, completed: true },
        });
        var { _count, ...taskFields } = task;
        return {
          ...taskFields,
          subtasks_total: _count.subtasks,
          subtasks_completed: completedCount,
        };
      }),
    );

    res.json(restlt.map(formatTask));
  } catch (error) {
    console.error("GET /tasks error:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

router.post(
  "/tasks",
  authMiddleware,
  [body("title").notEmpty().withMessage("Task title is required")],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      var task = await Prisma.tasks.create({
        data: {
          title: req.body.title,
          user_id: req.user.userId,
          description: req.body.description,
          due_date: req.body.due_date,
          priority: req.body.priority || "medium",
          category_id: req.body.category_id ? parseInt(req.body.category_id) : null,
        },
      });
      res.json(formatTask(task));
    } catch (error) {
      res.status(500).json({ message: "Error creating task" });
    }
  },
);

router.get("/tasks/:id", authMiddleware, async function (req, res) {
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(formatTask(task));
  } catch (error) {
    res.status(500).json({ message: "Error fetching task" });
  }
});

router.put("/tasks/:id", authMiddleware, [body("title").notEmpty().withMessage("Task title is required")], async function (req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    var updated = await Prisma.tasks.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title: req.body.title,
        description: req.body.description,
        due_date: req.body.due_date,
        priority: req.body.priority || "medium",
        category_id: req.body.category_id ? parseInt(req.body.category_id) : null,
      },
    });
    res.json(formatTask(updated));
  } catch (error) {
    res.status(500).json({ message: "Error updating task" });
  }
});

router.delete("/tasks/:id", authMiddleware, async function (req, res) {
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await Prisma.tasks.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task" });
  }
});

router.patch("/tasks/:id/complete", authMiddleware, async function (req, res) {
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    var nowCompleting = !task.completed;
    var updated = await Prisma.tasks.update({
      where: { id: parseInt(req.params.id) },
      data: {
        completed: nowCompleting,
        completed_at: nowCompleting ? new Date() : null,
      },
    });
    res.json(formatTask(updated));
  } catch (error) {
    res.status(500).json({ message: "Error updating task" });
  }
});

module.exports = router;

/*function formatTask(task) {
  if (task.due_date == null) {
    return task;
  }
  const year = task.due_date.getUTCFullYear();
  const month = (task.due_date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = task.due_date.getUTCDate().toString().padStart(2, "0");
  return { ...task, due_date: `${year}-${month}-${day}` };
}*/

function formatTask(task) {
  return task;
}
