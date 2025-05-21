const express = require("express");
const { return_sql, exec_sql } = require("../utils/dbUtils");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

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
