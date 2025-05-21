const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

app.use(
  session({
    secret: process.env.APP_SECRET,
    resave: false,
    saveUninitialized: true,
  })
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

// Use routes
app.use(authRoutes);
app.use("/posts", postsRoutes);
app.use("/users", usersRoutes);
app.use(profileRoutes);
app.use(changelogRoutes);

app.get("/healthcheck", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`Server is running at`, process.env.SERVER_ADDRESS);
});
