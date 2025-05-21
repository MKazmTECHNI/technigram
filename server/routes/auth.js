const express = require("express");
const passport = require("passport");

const router = express.Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.session.token = req.user.token;
    res.send(`
      <html>
        <body>
          <script>
            localStorage.setItem("currentUser", JSON.stringify({
              id: "${req.user.id}",
              username: "${req.user.username}",
              token: "${req.user.token}"
            }));
            window.location.replace("/index.html");
          </script>
        </body>
      </html>
    `);
  }
);

module.exports = router;
