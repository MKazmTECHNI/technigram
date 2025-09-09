const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { return_sql, exec_sql } = require("../../../utils/dbUtils");

const router = express.Router();

router.post("/", async (req, res) => {
  const code = req.body.code;
  if (!code) {
    console.error("[Google Callback] No code provided");
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", null, {
      params: {
        code,
        client_id: process.env.GOOGLESTRATEGY_CLIENTID,
        client_secret: process.env.GOOGLESTRATEGY_CLIENTSECRET,
        redirect_uri: process.env.GOOGLESTRATEGY_CALLBACKURL,
        grant_type: "authorization_code",
      },
    });
    const { id_token } = tokenRes.data;
    if (!id_token) {
      console.error("[Google Callback] No id_token returned");
      throw new Error("No id_token returned");
    }

    // Decode id_token to get user info
    const userInfo = jwt.decode(id_token);
    const email = userInfo.email;
    const username = userInfo.name || email;
    const trueName = userInfo.name || email;

    // Example: In your .env file, add:
    // ALLOWED_EMAILS=u123_abcdef_xyz@technischools.com,anotheruser@domain.com

    // Fetch allowed emails from DB
    const allowed_emails_result = await return_sql(`SELECT email FROM allowed_emails`);
    const allowed_emails = allowed_emails_result.map(row => row.email);

    // Validate email pattern
    if (
      !/^u\d{3}_[a-z]{6}_[a-z]{3}@technischools\.com$/.test(email) &&
      !allowed_emails.includes(email)
    ){
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
      token =
        user.token ||
        jwt.sign({ id: user.id }, process.env.APP_SECRET, {
          expiresIn: "1h",
        });
      if (!user.token) {
        await exec_sql(`UPDATE users SET token = ? WHERE id = ?`, [token, user.id]);
      }
    } else {
      const newUser = await exec_sql(
        `INSERT INTO users (username, email, true_name) VALUES (?, ?, ?) RETURNING id`,
        [username, email, trueName]
      );
      console.log("[Google Callback] New user created:", newUser);
      token = jwt.sign({ id: newUser.lastID }, process.env.APP_SECRET, {
        expiresIn: "1h",
      });
      await exec_sql(`UPDATE users SET token = ? WHERE id = ?`, [token, newUser.lastID]);
      user = { id: newUser.lastID, username };
    }
    res.json({ id: user.id, username: user.username, token });
  } catch (err) {
    console.error("[Google Callback] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
