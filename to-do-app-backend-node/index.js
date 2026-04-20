require("dotenv").config();
var express = require("express");
var cors = require("cors");
var app = express();

// Trust Render/reverse-proxy headers so express-rate-limit sees the real client IP.
app.set("trust proxy", 1);

// middleware
var allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(function (o) { return o.trim(); })
  : "*";

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// routes
const auth = require("./routes/auth.js");
app.use("/api", auth);

const tasks = require("./routes/tasks.js");
app.use("/api", tasks);

const subtasks = require("./routes/subtasks.js");
app.use("/api", subtasks);

const profile = require("./routes/profile.js");
app.use("/api", profile);

const categories = require("./routes/categories.js");
app.use("/api", categories);

// test route
app.get("/ping", function (req, res) {
  res.json({ message: "pong" });
});

// start server
app.listen(process.env.PORT || 3000, function () {
  console.log("Server running on port " + (process.env.PORT || 3000));
});
