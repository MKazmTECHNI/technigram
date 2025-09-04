const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const { generateToken } = require("../utils/tokenUtils");
const { return_sql } = require("../utils/dbUtils");

const router = express.Router();

// POST /api/auth/google/callback
router.post("/auth/google/callback", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    // Exchange code for tokens and user info
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userInfo = await oauth2.userinfo.get();
    const { id, email, name } = userInfo.data;

    // Create or update user in your DB
    let user = await return_sql("SELECT * FROM users WHERE google_id = ?", [id]);
    if (!user.length) {
      // Insert new user
      await return_sql("INSERT INTO users (google_id, username, email) VALUES (?, ?, ?)", [id, name, email]);
      user = await return_sql("SELECT * FROM users WHERE google_id = ?", [id]);
    }
    user = user[0];

    // Generate JWT token
    const token = generateToken(user);

    res.json({ id: user.id, username: user.username, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to authenticate with Google" });
  }
});

module.exports = router;
