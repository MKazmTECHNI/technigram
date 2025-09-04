const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { return_sql, exec_sql } = require("../../../utils/dbUtils");

const router = express.Router();

router.post("/", async (req, res) => {
  const code = req.body.code;
  if (!code) return res.status(400).json({ error: "No code provided" });

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
    if (!id_token) throw new Error("No id_token returned");

    // Decode id_token to get user info
    const userInfo = jwt.decode(id_token);
  const email = userInfo.email;
  // Use name if available, otherwise fallback to email
  const username = userInfo.name || email;

    // Validate email pattern
    if (!/^u\d{3}_[a-z]{6}_[a-z]{3}@technischools\.com$/.test(email)) {
      return res.status(403).json({ error: "Invalid email format" });
    }

    // Find or create user in DB
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
      const trueName = userInfo.name || email;
      const newUser = await exec_sql(
        `INSERT INTO users (username, email, true_name) VALUES (?, ?, ?) RETURNING id`,
        [username, email, trueName]
      );
      token = jwt.sign({ id: newUser.id }, process.env.APP_SECRET, {
        expiresIn: "1h",
      });
      await exec_sql(`UPDATE users SET token = ? WHERE id = ?`, [token, newUser.id]);
      user = { id: newUser.id, username };
    }
    res.json({ id: user.id, username: user.username, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
