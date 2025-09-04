const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { return_sql, exec_sql } = require("../../../utils/dbUtils");

const router = express.Router();

router.post("/", async (req, res) => {
  const code = req.body.code;
  console.log("[Google Callback] Received code:", code);
  if (!code) {
    console.error("[Google Callback] No code provided");
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // Exchange code for tokens
    console.log("[Google Callback] Requesting tokens from Google...");
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", null, {
      params: {
        code,
        client_id: process.env.GOOGLESTRATEGY_CLIENTID,
        client_secret: process.env.GOOGLESTRATEGY_CLIENTSECRET,
        redirect_uri: process.env.GOOGLESTRATEGY_CALLBACKURL,
        grant_type: "authorization_code",
      },
    });
    console.log("[Google Callback] Token response:", tokenRes.data);
    const { id_token } = tokenRes.data;
    if (!id_token) {
      console.error("[Google Callback] No id_token returned");
      throw new Error("No id_token returned");
    }

    // Decode id_token to get user info
    const userInfo = jwt.decode(id_token);
    console.log("[Google Callback] Decoded userInfo:", userInfo);
    const email = userInfo.email;
    const username = userInfo.name || email;
    const trueName = userInfo.name || email;

    // Validate email pattern
    if (!/^u\d{3}_[a-z]{6}_[a-z]{3}@technischools\.com$/.test(email)) {
      console.error("[Google Callback] Invalid email format:", email);
      return res.status(403).json({ error: "Invalid email format" });
    }

    // Find or create user in DB
    console.log("[Google Callback] Checking for existing user with email:", email);
    let result = await return_sql(
      `SELECT id, username, token FROM users WHERE email = ?`,
      [email]
    );
    let user;
    let token;
    if (result.length) {
      user = result[0];
      console.log("[Google Callback] Existing user found:", user);
      token =
        user.token ||
        jwt.sign({ id: user.id }, process.env.APP_SECRET, {
          expiresIn: "1h",
        });
      if (!user.token) {
        console.log("[Google Callback] Updating user token in DB...");
        await exec_sql(`UPDATE users SET token = ? WHERE id = ?`, [token, user.id]);
      }
    } else {
      console.log("[Google Callback] Creating new user with username:", username, "true_name:", trueName);
      const newUser = await exec_sql(
        `INSERT INTO users (username, email, true_name) VALUES (?, ?, ?) RETURNING id`,
        [username, email, trueName]
      );
      console.log("[Google Callback] New user created:", newUser);
      token = jwt.sign({ id: newUser.id }, process.env.APP_SECRET, {
        expiresIn: "1h",
      });
      console.log("[Google Callback] Setting token for new user...");
      await exec_sql(`UPDATE users SET token = ? WHERE id = ?`, [token, newUser.id]);
      user = { id: newUser.id, username };
    }
    console.log("[Google Callback] Responding with:", { id: user.id, username: user.username, token });
    res.json({ id: user.id, username: user.username, token });
  } catch (err) {
    console.error("[Google Callback] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
