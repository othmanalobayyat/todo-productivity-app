var express = require("express");
var Prisma = require("../prismaClient.js");
var router = express.Router();
var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
var crypto = require("crypto");
var authMiddleware = require("../middleware/auth.js");
var rateLimit = require("express-rate-limit");
var { body, validationResult } = require("express-validator");
var { Resend } = require("resend");

var resend = new Resend(process.env.RESEND_API_KEY);

var limiterOptions = {
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
};

var loginLimiter = rateLimit(limiterOptions);
var registerLimiter = rateLimit(limiterOptions);
var passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

router.post(
  "/register",
  registerLimiter,
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
      console.error("POST /register error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  },
);

router.post(
  "/login",
  loginLimiter,
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
        return res.status(401).json({ message: "Invalid email or password." });
      }
      delete user.password;
      var token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.json({ token });
    } catch (error) {
      console.error("POST /login error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  },
);

router.post("/logout", authMiddleware, function (req, res) {
  res.json({ message: "Logged out successfully" });
});

router.post(
  "/forgot-password",
  passwordResetLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address."),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(422)
        .json({ message: "Please provide a valid email address." });
    }

    const GENERIC =
      "If an account with that email exists, a reset link has been sent.";

    try {
      const user = await Prisma.users.findFirst({
        where: { email: req.body.email.trim() },
      });

      if (!user) {
        return res.json({ message: GENERIC });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = hashToken(rawToken);

      await Prisma.password_reset_tokens.upsert({
        where: { email: user.email },
        update: { token: hashedToken, created_at: new Date() },
        create: {
          email: user.email,
          token: hashedToken,
          created_at: new Date(),
        },
      });

      const appUrl = (process.env.APP_URL || "todoapp://").replace(/\/$/, "");
      const separator = appUrl.endsWith("://") ? "" : "/";
      const resetUrl =
        appUrl +
        separator +
        "reset-password?token=" +
        rawToken +
        "&email=" +
        encodeURIComponent(user.email);

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f5f5;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#451E5D;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Todo App</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:700;">Reset your password</h2>
            <p style="margin:0 0 28px 0;color:#555555;font-size:15px;line-height:1.6;">
              We received a request to reset the password for your account.<br/>
              Click the button below to choose a new password.
            </p>
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:32px;">
              <tr>
                <td style="background:#451E5D;border-radius:10px;">
                  <a href="${resetUrl}"
                     style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 28px 0;color:#888888;font-size:13px;line-height:1.6;">
              This link expires in <strong>1 hour</strong>. If you did not request a password reset,
              you can safely ignore this email — your password will remain unchanged.
            </p>
            <p style="margin:0;color:#aaaaaa;font-size:12px;line-height:1.8;">
              If the button above doesn't work, copy and paste this link into your browser:<br/>
              <span style="color:#451E5D;word-break:break-all;">${resetUrl}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;color:#bbbbbb;font-size:12px;">&copy; ${new Date().getFullYear()} Todo App. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: "Reset your password",
          html,
        });
      } catch (emailError) {
        console.error(
          "POST /forgot-password — Resend delivery failed:",
          emailError.message,
        );
      }

      return res.json({ message: GENERIC });
    } catch (error) {
      console.error("POST /forgot-password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  },
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address."),
    body("token").notEmpty().withMessage("Reset token is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("password_confirmation")
      .notEmpty()
      .withMessage("Password confirmation is required.")
      .bail()
      .custom((value, { req }) => {
        if (value !== req.body.password)
          throw new Error("Passwords do not match.");
        return true;
      }),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const { email, token, password } = req.body;
      const hashedToken = hashToken(token);

      const record = await Prisma.password_reset_tokens.findFirst({
        where: { email: email.trim(), token: hashedToken },
      });

      if (!record) {
        return res
          .status(400)
          .json({ message: "Invalid or expired password reset token." });
      }

      const ONE_HOUR_MS = 60 * 60 * 1000;
      if (
        !record.created_at ||
        Date.now() - new Date(record.created_at).getTime() > ONE_HOUR_MS
      ) {
        await Prisma.password_reset_tokens.delete({
          where: { email: email.trim() },
        });
        return res.status(400).json({
          message: "This reset link has expired. Please request a new one.",
        });
      }

      const hashed = await bcrypt.hash(password, 10);
      await Prisma.users.update({
        where: { email: email.trim() },
        data: { password: hashed },
      });
      await Prisma.password_reset_tokens.delete({
        where: { email: email.trim() },
      });

      return res.json({ message: "Password reset successfully." });
    } catch (error) {
      console.error("POST /reset-password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  },
);

router.put(
  "/change-password",
  authMiddleware,
  [
    body("current_password")
      .notEmpty()
      .withMessage("Current password is required."),
    body("new_password")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters."),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    try {
      const user = await Prisma.users.findFirst({
        where: { id: req.user.userId },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const match = await bcrypt.compare(
        req.body.current_password,
        user.password,
      );
      if (!match) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect." });
      }

      const hashed = await bcrypt.hash(req.body.new_password, 10);
      await Prisma.users.update({
        where: { id: user.id },
        data: { password: hashed },
      });

      return res.json({ message: "Password changed successfully." });
    } catch (error) {
      console.error("PUT /change-password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  },
);

module.exports = router;
