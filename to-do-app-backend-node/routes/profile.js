var express = require("express");
var Prisma = require("../prismaClient.js");
var router = express.Router();
var authMiddleware = require("../middleware/auth.js");
var { body, validationResult } = require("express-validator");

router.get("/profile", authMiddleware, async function (req, res) {
  try {
    var user = await Prisma.users.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    delete user.password;
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile" });
  }
});

router.put(
  "/profile",
  authMiddleware,
  [
    body("email").isEmail(),
    body("name").isLength({ min: 2, max: 100 }),
  ],
  async function (req, res) {
    try {
      var errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      var updated = await Prisma.users.update({
        where: { id: req.user.userId },
        data: { name: req.body.name, email: req.body.email },
      });
      res.json({ name: updated.name, email: updated.email });
    } catch (error) {
      res.status(500).json({ message: "Error updating profile" });
    }
  },
);

module.exports = router;
