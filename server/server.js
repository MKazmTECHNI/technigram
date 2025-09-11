
const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const https = require("https");
const fs = require("fs");
require("dotenv").config();


const { initDb } = require('./init-db');


const app = express();
const port = 7777;

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../privkey.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../fullchain.pem'))
};

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
const googleCallbackApi = require("./api/auth/google/callback");
const reportRouter = require("./routes/report");
const dbTablesApi = require("./api/db/tables");
const checkPermissionApi = require("./api/db/checkPermission");

// ADMIN PANEL ENDPOINTS (DISABLED FOR PROD)
// const getTables = require("./api/db/tables");
// const getTableData = require("./api/db/tableData");
// const addTableEntry = require("./api/db/addEntry");
// const createTable = require("./api/db/createTable");
// const getTableColumns = require("./api/db/tableColumns");
// const alterTable = require("./api/db/alterTable");
// Yes I'll finally get around to making a proper admin panel

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

// ADMIN PANEL ENDPOINTS (DISABLED FOR PROD)
// app.get("/api/db/tables", getTables);
// app.get("/api/db/table/:table", getTableData);
// app.get("/api/db/table/:table/columns", getTableColumns);
// app.post("/api/db/table/:table", addTableEntry);
// app.post("/api/db/createTable", createTable);
// app.post("/api/db/alterTable", alterTable);

app.get("/healthcheck", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

initDb((err) => {
  if (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
  https.createServer(httpsOptions, app).listen(port, () => {
    console.log(`HTTPS server is running at ${port}`);
  });
});
