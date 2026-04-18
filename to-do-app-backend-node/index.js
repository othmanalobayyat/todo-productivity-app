require("dotenv").config();
var express = require("express");
var app = express();

// middleware
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
