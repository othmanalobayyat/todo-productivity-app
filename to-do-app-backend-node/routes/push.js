var express = require("express");
var Prisma = require("../prismaClient.js");
var authMiddleware = require("../middleware/auth.js");
var router = express.Router();
var { body, validationResult } = require("express-validator");

// Registers (or refreshes) a Web Push subscription for the authenticated
// user's device. Keyed by endpoint, which is unique per browser
// installation — re-subscribing (e.g. after pushsubscriptionchange) simply
// upserts the same or a new row, always re-pointed at the current user.
router.post(
  "/push-subscriptions",
  authMiddleware,
  [
    body("endpoint").notEmpty().withMessage("endpoint is required"),
    body("keys.p256dh").notEmpty().withMessage("keys.p256dh is required"),
    body("keys.auth").notEmpty().withMessage("keys.auth is required"),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      var sub = await Prisma.push_subscriptions.upsert({
        where: { endpoint: req.body.endpoint },
        update: {
          user_id: req.user.userId,
          p256dh: req.body.keys.p256dh,
          auth: req.body.keys.auth,
          last_seen_at: new Date(),
        },
        create: {
          user_id: req.user.userId,
          endpoint: req.body.endpoint,
          p256dh: req.body.keys.p256dh,
          auth: req.body.keys.auth,
          last_seen_at: new Date(),
        },
      });
      res.json({ id: sub.id });
    } catch (error) {
      res.status(500).json({ message: "Error registering push subscription" });
    }
  },
);

// Removes a subscription. Scoped to the authenticated user's own
// subscriptions — deleteMany with both conditions means a mismatched
// endpoint/user pair silently deletes nothing rather than another user's row.
router.delete("/push-subscriptions", authMiddleware, async function (req, res) {
  try {
    if (!req.body.endpoint) {
      return res.status(400).json({ message: "endpoint is required" });
    }
    await Prisma.push_subscriptions.deleteMany({
      where: { endpoint: req.body.endpoint, user_id: req.user.userId },
    });
    res.json({ message: "Subscription removed" });
  } catch (error) {
    res.status(500).json({ message: "Error removing push subscription" });
  }
});

module.exports = router;
