const express = require("express");
const { return_sql, exec_sql } = require("../utils/dbUtils");
const { authenticateToken } = require("../middleware/auth");
const { checkPermission } = require("../utils/checkPermission");

const router = express.Router();

// Middleware: check admin/moderator permission
async function requireAdmin(req, res, next) {
  const id = req.headers["x-user-id"] || req.user?.id;
  const perm = await checkPermission(id, ["admin", "moderator", "nauczyciel", "dyrektor"]);
  if (!perm.allowed) return res.status(403).json({ error: perm.error });
  next();
}

// GET /api/admin/users
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await return_sql(
      "SELECT id, username, true_name, email, permission, timeout, custom_css_disabled, created_at FROM users ORDER BY id DESC LIMIT 200"
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/posts
router.get("/posts", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const posts = await return_sql(`
      SELECT p.post_id, p.content, p.creator_id, p.hidden, p.created_at, p.likes,
             u.username
      FROM posts p JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC LIMIT 200
    `);
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/comments
router.get("/comments", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const comments = await return_sql(`
      SELECT c.comment_id, c.comment_content, c.post_id, c.comment_creator_id, c.created_at,
             u.username
      FROM comments c JOIN users u ON c.comment_creator_id = u.id
      ORDER BY c.created_at DESC LIMIT 200
    `);
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/mute/:userId
router.post("/mute/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { duration } = req.body; // in minutes, null = unmute
    if (duration) {
      const timeout = new Date(Date.now() + duration * 60 * 1000).toISOString();
      await exec_sql("UPDATE users SET timeout = ? WHERE id = ?", [timeout, userId]);
    } else {
      await exec_sql("UPDATE users SET timeout = NULL WHERE id = ?", [userId]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/hide-post/:postId
router.post("/hide-post/:postId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await return_sql("SELECT hidden FROM posts WHERE post_id = ?", [postId]);
    if (!post.length) return res.status(404).json({ error: "Post not found" });
    const newHidden = post[0].hidden ? 0 : 1;
    await exec_sql("UPDATE posts SET hidden = ? WHERE post_id = ?", [newHidden, postId]);
    res.json({ success: true, hidden: !!newHidden });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/toggle-css/:userId
router.post("/toggle-css/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await return_sql("SELECT custom_css_disabled FROM users WHERE id = ?", [userId]);
    if (!user.length) return res.status(404).json({ error: "User not found" });
    const newVal = user[0].custom_css_disabled ? 0 : 1;
    await exec_sql("UPDATE users SET custom_css_disabled = ? WHERE id = ?", [newVal, userId]);
    res.json({ success: true, disabled: !!newVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/delete-post/:postId
router.post("/delete-post/:postId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await exec_sql("DELETE FROM comments WHERE post_id = ?", [req.params.postId]);
    await exec_sql("DELETE FROM post_likes WHERE post_id = ?", [req.params.postId]);
    await exec_sql("DELETE FROM post_views WHERE post_id = ?", [req.params.postId]);
    await exec_sql("DELETE FROM post_tags WHERE post_id = ?", [req.params.postId]);
    await exec_sql("DELETE FROM posts WHERE post_id = ?", [req.params.postId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/delete-comment/:commentId
router.post("/delete-comment/:commentId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    await exec_sql("DELETE FROM comment_likes WHERE comment_id = ?", [req.params.commentId]);
    await exec_sql("DELETE FROM comments WHERE comment_id = ?", [req.params.commentId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/change-permission/:userId
router.post("/change-permission/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { permission } = req.body;
    const allowed = ["uczen", "nauczyciel", "admin", "dyrektor", "moderator"];
    if (!allowed.includes(permission)) return res.status(400).json({ error: "Invalid permission" });
    await exec_sql("UPDATE users SET permission = ? WHERE id = ?", [permission, req.params.userId]);
    res.json({ success: true, permission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;