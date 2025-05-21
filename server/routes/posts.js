const express = require("express");
const xss = require("xss");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec_sql, return_sql } = require("../utils/dbUtils");
const { postCommentLimiter } = require("../middleware/rateLimiter");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Multer setup for post images
const postImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../public/images/posts");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + original name for uniqueness
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({
  storage: postImageStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Get post count
router.get("/count", async (req, res) => {
  try {
    const results = await return_sql("SELECT COUNT(*) AS count FROM posts");
    res.json({ numberOfPosts: results[0].count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post count" });
  }
});

// Get post details
router.get("/:post_id", async (req, res) => {
  const postId = req.params.post_id;
  try {
    const postQuery = `
      SELECT content, creator_id, created_at, likes, image
      FROM posts
      WHERE post_id = ?`;
    const postResults = await return_sql(postQuery, [postId]);
    if (postResults.length === 0) throw new Error("Post not found");
    const post = postResults[0];

    const userQuery = `
      SELECT username, profile_picture, true_name
      FROM users
      WHERE id = ?`;
    const userResults = await return_sql(userQuery, [post.creator_id]);
    if (userResults.length === 0) throw new Error("User not found");
    const { username, profile_picture, true_name } = userResults[0];

    // Ensure profile_picture is a valid URL or fallback to default
    const profilePictureUrl =
      profile_picture && profile_picture !== ""
        ? profile_picture
        : "/images/profiles/default-profile.png";

    const commentsQuery = `
      SELECT comment_creator_id, comment_content
      FROM comments
      WHERE post_id = ?`;
    const commentResults = await return_sql(commentsQuery, [postId]);
    const comments = await Promise.all(
      commentResults.map(async (comment) => {
        const commentUserQuery = `
          SELECT username, profile_picture
          FROM users
          WHERE id = ?`;
        const commentUserResults = await return_sql(commentUserQuery, [
          comment.comment_creator_id,
        ]);
        const {
          username: commentUsername,
          profile_picture: commentProfilePicture,
        } = commentUserResults[0];
        return {
          ...comment,
          username: commentUsername,
          profile_picture: commentProfilePicture,
        };
      })
    );

    res.json({
      content: post.content,
      creator_id: post.creator_id,
      creatorUsername: username,
      trueName: true_name,
      creatorProfilePicture: profilePictureUrl,
      likes: post.likes,
      date: post.created_at,
      image: post.image || null,
      comments,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a comment to a post
router.post(
  "/:post_id/comments",
  postCommentLimiter,
  authenticateToken,
  async (req, res) => {
    const post_id = req.params.post_id;
    const { comment_content } = req.body;
    const comment_creator_id = req.user.id;

    if (!comment_content) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    if (comment_content.length > 500) {
      return res
        .status(400)
        .json({ error: "Length of the text cannot exceed 500 characters" });
    }

    const sanitizedCommentContent = xss(comment_content);

    try {
      const insertResult = await exec_sql(
        `INSERT INTO comments (post_id, comment_creator_id, comment_content) VALUES (?, ?, ?)`,
        [post_id, comment_creator_id, sanitizedCommentContent]
      );
      res.json({
        comment_id: insertResult.lastID,
        comment_creator_id,
        comment_content: sanitizedCommentContent,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to add comment" });
    }
  }
);

// Create a new post
router.post(
  "/",
  postCommentLimiter,
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    // Support both JSON and multipart/form-data
    let content;
    if (req.is("multipart/form-data")) {
      content = req.body.content;
    } else {
      content = req.body.content;
    }
    const creator_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    if (content.length > 1500) {
      return res
        .status(400)
        .json({ error: "Content cannot exceed 1500 characters" });
    }

    // Handle image if present
    let imagePath = null;
    if (req.file) {
      imagePath = `/images/posts/${req.file.filename}`;
    }

    try {
      const insertResult = await exec_sql(
        `INSERT INTO posts (creator_id, content${
          imagePath ? ", image" : ""
        }) VALUES (?, ?${imagePath ? ", ?" : ""})`,
        imagePath ? [creator_id, content, imagePath] : [creator_id, content]
      );
      res.status(201).json({
        post_id: insertResult.lastID,
        creator_id,
        content,
        image: imagePath,
        likes: 0,
        created_at: new Date(),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to add post" });
    }
  }
);

module.exports = router;
