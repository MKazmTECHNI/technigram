const express = require("express");
const { return_sql, exec_sql } = require("../utils/dbUtils");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const SERVER_ADDRESS = process.env.SERVER_ADDRESS;

// GET USER USERNAME BY ID
router.get("/:user_id", async (req, res) => {
  const user_id = req.params.user_id;
  try {
    const result = await return_sql(`SELECT username FROM users WHERE id = ?`, [
      user_id,
    ]);
    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// GET USER PROFILE BY USERNAME
router.get("/by-username/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const result = await return_sql(
      `SELECT username, true_name, profile_picture FROM users WHERE username = ?`,
      [username]
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = result[0];
    user.profile_picture =
      user.profile_picture && user.profile_picture !== ""
        ? `${SERVER_ADDRESS}${user.profile_picture}`
        : `${SERVER_ADDRESS}/images/profiles/default-profile.png`;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// GET POSTS BY USERNAME
router.get("/:username/posts", async (req, res) => {
  const username = req.params.username;
  try {
    const userResult = await return_sql(
      `SELECT id FROM users WHERE username = ?`,
      [username]
    );
    if (!userResult.length) {
      return res.status(404).json({ error: "User not found" });
    }
    const userId = userResult[0].id;
    const posts = await return_sql(
      `SELECT post_id, content, image, created_at as date, likes FROM posts WHERE creator_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

// Change username
router.post("/changeUsername", authenticateToken, async (req, res) => {
  const { username } = req.body;
  const userId = req.user.id;

  if (username.length > 28) {
    return res
      .status(400)
      .json({ success: false, message: "Username is too long. Max: 28" });
  }
  if (username.length < 3) {
    return res
      .status(400)
      .json({ success: false, message: "Username is too short. Min: 3" });
  }

  try {
    await exec_sql(`UPDATE users SET username = ? WHERE id = ?`, [
      username,
      userId,
    ]);
    res.status(200).json({ message: "Username updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update username" });
  }
});

module.exports = router;
