const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { initDb } = require("./init-db");

const app = express();
const port = process.env.MOCK_PORT || 777;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "../public/images")));

app.use(
  session({
    secret: process.env.APP_SECRET,
    resave: false,
    saveUninitialized: true,
  }),
);

// Passport config
require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());

// Route imports
const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const usersRoutes = require("./routes/users");
const profileRoutes = require("./routes/profile");
const changelogRoutes = require("./routes/changelog");
const googleCallbackApi = require("./api/auth/google/callback");
const reportRouter = require("./routes/report");
const socialRouter = require("./routes/social");
const feedRouter = require("./routes/feed");
const adminRouter = require("./routes/admin");
const dbTablesApi = require("./api/db/tables");
const checkPermissionApi = require("./api/db/checkPermission");

// Use routes
app.use(authRoutes);
app.use("/posts", postsRoutes);
app.use("/users", usersRoutes);
app.use(profileRoutes);
app.use(changelogRoutes);
app.use("/api/auth/google/callback", googleCallbackApi);

app.use("/report", reportRouter);
app.use("/api/db/tables", dbTablesApi);
app.use("/api/db/check-permission", checkPermissionApi);
app.use("/social", socialRouter);
app.use("/feed", feedRouter);
app.use("/api/admin", adminRouter);

app.get("/healthcheck", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

initDb((err) => {
  if (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Mock HTTP server is running at ${port}`);
  });
});
