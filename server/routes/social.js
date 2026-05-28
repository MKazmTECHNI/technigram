const express = require("express");
const { exec_sql, return_sql } = require("../utils/dbUtils");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Follow a user
router.post("/follow/:userId", authenticateToken, async (req, res) => {
  const follower_id = req.user.id;
  const following_id = req.params.userId;

  if (Number(follower_id) === Number(following_id)) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    // Check if already following
    const existing = await return_sql(
      "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
      [follower_id, following_id]
    );

    if (existing.length) {
      // Unfollow
      await exec_sql(
        "DELETE FROM follows WHERE follower_id = ? AND following_id = ?",
        [follower_id, following_id]
      );
      return res.json({ following: false });
    }

    // Follow
    await exec_sql(
      "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)",
      [follower_id, following_id]
    );
    res.json({ following: true });
  } catch (err) {
    console.error("Error in follow:", err);
    res.status(500).json({ error: "Failed to follow/unfollow user" });
  }
});

// Check follow status
router.get("/follow/:userId/status", authenticateToken, async (req, res) => {
  const follower_id = req.user.id;
  const following_id = req.params.userId;

  try {
    const result = await return_sql(
      "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?",
      [follower_id, following_id]
    );
    res.json({ following: result.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to check follow status" });
  }
});

// Get followers count
router.get("/follow/:userId/count", async (req, res) => {
  const userId = req.params.userId;
  try {
    const [followers] = await return_sql(
      "SELECT COUNT(*) AS count FROM follows WHERE following_id = ?",
      [userId]
    );
    const [following] = await return_sql(
      "SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?",
      [userId]
    );
    res.json({
      followers: followers.count,
      following: following.count,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get follow counts" });
  }
});

// Track post view
router.post("/view/:postId", authenticateToken, async (req, res) => {
  const post_id = req.params.postId;
  const user_id = req.user.id;

  try {
    await exec_sql(
      "INSERT INTO post_views (post_id, user_id) VALUES (?, ?)",
      [post_id, user_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to track view" });
  }
});

// Get tags for a post
router.get("/tags/:postId", async (req, res) => {
  try {
    const tags = await return_sql(
      `SELECT t.tag_id, t.name FROM tags t
       JOIN post_tags pt ON t.tag_id = pt.tag_id
       WHERE pt.post_id = ?`,
      [req.params.postId]
    );
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

module.exports = router;