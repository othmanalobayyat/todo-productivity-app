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
    res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar || null });
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile" });
  }
});

const HTTPS_URL = /^https:\/\/.+/;

router.put(
  "/profile",
  authMiddleware,
  [
    body("email").optional().isEmail(),
    body("name").optional().isLength({ min: 2, max: 100 }),
    body("avatar").optional({ nullable: true }).custom((val) => {
      if (val !== null && !HTTPS_URL.test(val)) throw new Error("Invalid avatar URL");
      return true;
    }),
  ],
  async function (req, res) {
    try {
      var errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      var data = {};
      if (req.body.name  !== undefined) data.name  = req.body.name;
      if (req.body.email !== undefined) data.email = req.body.email;
      if (req.body.avatar !== undefined) data.avatar = req.body.avatar;

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "Nothing to update" });
      }

      var updated = await Prisma.users.update({
        where: { id: req.user.userId },
        data,
      });
      res.json({ name: updated.name, email: updated.email, avatar: updated.avatar || null });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "That email address is already in use." });
      }
      res.status(500).json({ message: "Error updating profile" });
    }
  },
);

module.exports = router;
