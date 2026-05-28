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
      `SELECT id, username, true_name, profile_picture, created_at FROM users WHERE username = ?`,
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
      `SELECT id, username, true_name, profile_picture FROM users WHERE username = ?`,
      [username]
    );
    if (!userResult.length) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userResult[0];
    const userId = user.id;

    const profilePictureUrl =
      user.profile_picture && user.profile_picture !== ""
        ? user.profile_picture.startsWith("http")
          ? user.profile_picture
          : `${SERVER_ADDRESS}${user.profile_picture}`
        : `${SERVER_ADDRESS}/images/profiles/default-profile.png`;

    const posts = await return_sql(
      `SELECT post_id, content, image, created_at as date, likes FROM posts WHERE creator_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // Fetch comments for all posts in batch
    const postIds = posts.map(p => p.post_id);
    let commentsMap = {};
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const comments = await return_sql(`
        SELECT c.comment_id, c.comment_creator_id, c.post_id, c.comment_content, c.likes,
               u.username, u.profile_picture
        FROM comments c
        JOIN users u ON c.comment_creator_id = u.id
        WHERE c.post_id IN (${placeholders})
      `, postIds);

      for (const comment of comments) {
        if (!commentsMap[comment.post_id]) commentsMap[comment.post_id] = [];
        let picUrl;
        if (comment.profile_picture && comment.profile_picture !== "") {
          if (comment.profile_picture.startsWith("http")) {
            picUrl = comment.profile_picture;
          } else {
            picUrl = `${SERVER_ADDRESS}${comment.profile_picture}`;
          }
        } else {
          picUrl = `${SERVER_ADDRESS}/images/profiles/default-profile.png`;
        }
        commentsMap[comment.post_id].push({
          comment_id: comment.comment_id,
          comment_content: comment.comment_content,
          likes: comment.likes || 0,
          username: comment.username,
          profile_picture: picUrl,
        });
      }
    }

    const result = posts.map(post => ({
      post_id: post.post_id,
      content: post.content,
      image: post.image ? `${SERVER_ADDRESS}${post.image}` : null,
      date: post.date,
      likes: post.likes || 0,
      comments: commentsMap[post.post_id] || [],
      creatorUsername: username,
      trueName: user.true_name || "",
      creatorProfilePicture: profilePictureUrl,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching user posts:", err);
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
