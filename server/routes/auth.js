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
    // Redirect to frontend loginCallback page with user info in query params
    const params = new URLSearchParams({
      id: req.user.id,
      username: req.user.username,
      token: req.user.token,
    }).toString();
    res.redirect(`/loginCallback?${params}`);
  }
);

module.exports = router;
