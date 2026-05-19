var express = require("express");
var crypto = require("crypto");
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
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
      avatar_public_id: user.avatar_public_id || null,
    });
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
    body("avatar_public_id").optional({ nullable: true }).isString(),
  ],
  async function (req, res) {
    try {
      var errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      var data = {};
      if (req.body.name             !== undefined) data.name             = req.body.name;
      if (req.body.email            !== undefined) data.email            = req.body.email;
      if (req.body.avatar           !== undefined) data.avatar           = req.body.avatar;
      if (req.body.avatar_public_id !== undefined) data.avatar_public_id = req.body.avatar_public_id;

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: "Nothing to update" });
      }

      var updated = await Prisma.users.update({
        where: { id: req.user.userId },
        data,
      });
      res.json({
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar || null,
        avatar_public_id: updated.avatar_public_id || null,
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "That email address is already in use." });
      }
      res.status(500).json({ message: "Error updating profile" });
    }
  },
);

// Deletes the user's current avatar from Cloudinary and clears it from the DB.
// API secret stays server-side — the client never sees it.
router.delete("/profile/avatar", authMiddleware, async function (req, res) {
  try {
    console.log("[avatar/delete] userId:", req.user.userId);

    var user = await Prisma.users.findUnique({
      where: { id: req.user.userId },
      select: { avatar_public_id: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("[avatar/delete] avatar_public_id from DB:", user.avatar_public_id);

    // Attempt Cloudinary deletion only if we have a stored public_id.
    if (user.avatar_public_id) {
      try {
        var cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        var apiKey    = process.env.CLOUDINARY_API_KEY;
        var apiSecret = process.env.CLOUDINARY_API_SECRET;

        console.log("[avatar/delete] env vars present — CLOUDINARY_CLOUD_NAME:", !!cloudName, "| CLOUDINARY_API_KEY:", !!apiKey, "| CLOUDINARY_API_SECRET:", !!apiSecret);

        var timestamp = Math.round(Date.now() / 1000).toString();
        var signature = crypto
          .createHash("sha256")
          .update(`public_id=${user.avatar_public_id}&timestamp=${timestamp}${apiSecret}`)
          .digest("hex");

        console.log("[avatar/delete] timestamp:", timestamp, "| signature:", signature);

        var params = new URLSearchParams({
          public_id: user.avatar_public_id,
          api_key:   apiKey,
          timestamp,
          signature,
        });

        var cdnRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
          { method: "POST", body: params },
        );
        var cdnBody = await cdnRes.json();
        console.log("[avatar/delete] Cloudinary response status:", cdnRes.status, "| body:", JSON.stringify(cdnBody));
      } catch (cdnErr) {
        // Log but don't block — the DB record will still be cleared.
        console.error("[avatar/delete] Cloudinary delete threw:", cdnErr.message, cdnErr);
      }
    }

    // Clear both avatar fields regardless of CDN outcome.
    await Prisma.users.update({
      where: { id: req.user.userId },
      data: { avatar: null, avatar_public_id: null },
    });

    console.log("[avatar/delete] DB cleared. Sending 204.");
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Error deleting avatar" });
  }
});

module.exports = router;
