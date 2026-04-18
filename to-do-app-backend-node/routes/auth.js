var express = require("express");
var Prisma = require("../prismaClient.js");
var router = express.Router();
var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
var authMiddleware = require("../middleware/auth.js");

var { body, validationResult } = require("express-validator");

router.post(
  "/register",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    req.body.password = await bcrypt.hash(req.body.password, 10);
    try {
      var user = await Prisma.users.create({
        data: {
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
        },
      });
      delete user.password;
      var token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({ token, user });
    } catch (error) {
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ message: "The email address is already in use." });
      }
    }
  },
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").notEmpty()],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      var user = await Prisma.users.findFirst({
        where: { email: req.body.email },
      });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password." });
      }
      var match = await bcrypt.compare(req.body.password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      delete user.password;
      var token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({ token });
    } catch (error) {}
  },
);

router.post("/logout", authMiddleware, function (req, res) {
  // Invalidate the token on the client side by removing it from storage
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
