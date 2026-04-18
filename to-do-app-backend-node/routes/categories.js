var express = require("express");
var Prisma = require("../prismaClient.js");
var authMiddleware = require("../middleware/auth.js");
var router = express.Router();

router.get("/task-categories", authMiddleware, async function (req, res) {
  try {
    var categories = await Prisma.task_categories.findMany({});
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories" });
  }
});

module.exports = router;
