var express = require("express");
var Prisma = require("../prismaClient.js");
var authMiddleware = require("../middleware/auth.js");
var router = express.Router();
var { body, validationResult } = require("express-validator");

router.get("/tasks/:taskId/subtasks", authMiddleware, async function (req, res) {
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.taskId), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    var subtasks = await Prisma.subtasks.findMany({
      where: { task_id: parseInt(req.params.taskId) },
    });
    res.json(subtasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subtasks" });
  }
});

router.post(
  "/tasks/:taskId/subtasks",
  authMiddleware,
  [body("title").notEmpty().withMessage("Title is required")],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      var task = await Prisma.tasks.findFirst({
        where: { id: parseInt(req.params.taskId), user_id: req.user.userId },
      });
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      var subtask = await Prisma.subtasks.create({
        data: {
          title: req.body.title,
          task_id: parseInt(req.params.taskId),
        },
      });
      res.status(201).json(subtask);
    } catch (error) {
      res.status(500).json({ message: "Error creating subtask" });
    }
  },
);

router.patch(
  "/tasks/:taskId/subtasks/:id/toggle",
  authMiddleware,
  async function (req, res) {
    try {
      var task = await Prisma.tasks.findFirst({
        where: { id: parseInt(req.params.taskId), user_id: req.user.userId },
      });
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      var subtask = await Prisma.subtasks.findFirst({
        where: {
          id: parseInt(req.params.id),
          task_id: parseInt(req.params.taskId),
        },
      });
      if (!subtask) return res.status(404).json({ message: "Subtask not found" });

      var updated = await Prisma.subtasks.update({
        where: { id: parseInt(req.params.id) },
        data: { completed: !subtask.completed },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating subtask" });
    }
  },
);

router.delete(
  "/tasks/:taskId/subtasks/:id",
  authMiddleware,
  async function (req, res) {
    try {
      var task = await Prisma.tasks.findFirst({
        where: { id: parseInt(req.params.taskId), user_id: req.user.userId },
      });
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      var subtask = await Prisma.subtasks.findFirst({
        where: {
          id: parseInt(req.params.id),
          task_id: parseInt(req.params.taskId),
        },
      });
      if (!subtask) return res.status(404).json({ message: "Subtask not found" });

      await Prisma.subtasks.delete({
        where: { id: parseInt(req.params.id) },
      });
      res.json({ message: "Subtask deleted" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting subtask" });
    }
  },
);

module.exports = router;
