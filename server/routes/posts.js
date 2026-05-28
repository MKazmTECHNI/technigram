const express = require("express");
const xss = require("xss");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec_sql, return_sql } = require("../utils/dbUtils");
const {
  postCommentLimiter,
  postLikeLimiter,
  commentLikeLimiter,
  postCreateLimiter,
} = require("../middleware/rateLimiter");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const SERVER_ADDRESS = process.env.SERVER_ADDRESS;

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
      // Do not log error to console, just pass error to cb
      const err = new Error("Only JPEG and PNG files are allowed");
      err.code = "LIMIT_FILE_TYPE";
      return cb(err);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helper: wrap async route handlers to catch Multer errors
function multerErrorHandler(handler) {
  return function (req, res, next) {
    handler(req, res, next).catch((err) => {
      if (err && err.message === "Only JPEG and PNG files are allowed") {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    });
  };
}

// Get post count
router.get("/count", async (req, res) => {
  try {
    const results = await return_sql("SELECT COUNT(*) AS count FROM posts");
    res.json({ numberOfPosts: results[0].count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post count" });
  }
});

// Get paginated posts (newest first)
router.get("/", async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const posts = await return_sql(`
      SELECT p.post_id, p.content, p.creator_id, p.created_at, p.likes, p.image,
             u.username, u.true_name, u.profile_picture
      FROM posts p
      JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`, [limit, offset]);

    const postIds = posts.map(p => p.post_id);
    const totalResult = await return_sql("SELECT COUNT(*) AS count FROM posts");
    const total = totalResult[0].count;

    // Fetch comments for all posts in batch
    let commentsMap = {};
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(',');
      const comments = await return_sql(`
        SELECT c.comment_id, c.comment_creator_id, c.post_id, c.comment_content, c.likes,
               u.username, u.profile_picture
        FROM comments c
        JOIN users u ON c.comment_creator_id = u.id
        WHERE c.post_id IN (${placeholders})`, postIds);

      // Group comments by post_id
      for (const comment of comments) {
        if (!commentsMap[comment.post_id]) commentsMap[comment.post_id] = [];
        let profilePicUrl;
        if (comment.profile_picture && comment.profile_picture !== "") {
          if (comment.profile_picture.startsWith("http")) {
            profilePicUrl = comment.profile_picture;
          } else {
            profilePicUrl = `${SERVER_ADDRESS}${comment.profile_picture}`;
          }
        } else {
          profilePicUrl = `${SERVER_ADDRESS}/images/profiles/default-profile.png`;
        }
        commentsMap[comment.post_id].push({
          comment_id: comment.comment_id,
          comment_content: comment.comment_content,
          likes: comment.likes || 0,
          username: comment.username,
          profile_picture: profilePicUrl,
        });
      }
    }

    const result = posts.map(post => {
      const profilePictureUrl =
        post.profile_picture && post.profile_picture !== ""
          ? post.profile_picture.startsWith("http")
            ? post.profile_picture
            : `${SERVER_ADDRESS}${post.profile_picture}`
          : `${SERVER_ADDRESS}/images/profiles/default-profile.png`;

      const imageUrl = post.image && post.image !== "" ? `${SERVER_ADDRESS}${post.image}` : null;

      return {
        post_id: post.post_id,
        content: post.content,
        creatorUsername: post.username,
        trueName: post.true_name,
        creatorProfilePicture: profilePictureUrl,
        likes: post.likes || 0,
        date: post.created_at,
        image: imageUrl,
        comments: commentsMap[post.post_id] || [],
      };
    });

    res.json({ posts: result, total, offset, limit });
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get post details
router.get("/:post_id", async (req, res) => {
  const postId = req.params.post_id;
  try {
    const postQuery = `
      SELECT post_id, content, creator_id, created_at, likes, image
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
        ? profile_picture.startsWith("http")
          ? profile_picture
          : `${SERVER_ADDRESS}${profile_picture}`
        : `${SERVER_ADDRESS}/images/profiles/default-profile.png`;

    const imageUrl =
      post.image && post.image !== "" ? `${SERVER_ADDRESS}${post.image}` : null;

    const commentsQuery = `
      SELECT comment_id, comment_creator_id, comment_content, likes
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
        let profilePicUrl;
        if (commentProfilePicture && commentProfilePicture !== "") {
          if (commentProfilePicture.startsWith("http")) {
            profilePicUrl = commentProfilePicture;
          } else {
            // Ensure correct path prefix
            const picPath = commentProfilePicture.startsWith(
              "/images/profiles/"
            )
              ? commentProfilePicture
              : `${SERVER_ADDRESS}/images/profiles/${commentProfilePicture}`;
            profilePicUrl = `${picPath}`;
          }
        } else {
          profilePicUrl = `${SERVER_ADDRESS}/images/profiles/default-profile.png`;
        }
        return {
          comment_id: comment.comment_id,
          comment_content: comment.comment_content,
          likes: comment.likes,
          username: commentUsername,
          profile_picture: profilePicUrl,
        };
      })
    );

    res.json({
      post_id: post.post_id,
      content: post.content,
      creator_id: post.creator_id,
      creatorUsername: username,
      trueName: true_name,
      creatorProfilePicture: profilePictureUrl,
      likes: post.likes,
      date: post.created_at,
      image: imageUrl,
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

    // Debug log
    if (!comment_creator_id) {
      console.error("No user id found in req.user:", req.user);
      return res
        .status(401)
        .json({ error: "User authentication failed (no id)" });
    }

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
  postCreateLimiter,
  authenticateToken,
  (req, res, next) => {
    upload.single("image")(req, res, function (err) {
      if (
        err &&
        (err.message === "Only JPEG and PNG files are allowed" ||
          err.code === "LIMIT_FILE_TYPE")
      ) {
        return res.json({ error: "Only PNG and JPEG are allowed!" });
      }
      if (err) {
        return res.json({ error: "File upload error" });
      }
      next();
    });
  },
  async (req, res) => {
    const content = req.body.content;
    const creator_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }
    if (content.length > 1500) {
      return res
        .status(400)
        .json({ error: "Content cannot exceed 1500 characters" });
    }

    const sanitizedContent = xss(content);

    let imagePath = null;
    if (req.file) {
      imagePath = `/images/posts/${req.file.filename}`;
    }

    try {
      const insertResult = await exec_sql(
        `INSERT INTO posts (creator_id, content${
          imagePath ? ", image" : ""
        }) VALUES (?, ?${imagePath ? ", ?" : ""})`,
        imagePath ? [creator_id, sanitizedContent, imagePath] : [creator_id, sanitizedContent]
      );
      res.status(201).json({
        post_id: insertResult.lastID,
        creator_id,
        content: sanitizedContent,
        image: imagePath ? `${SERVER_ADDRESS}${imagePath}` : null,
        likes: 0,
        created_at: new Date(),
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to add post" });
    }
  }
);

// Like/unlike a post
router.post(
  "/:post_id/like",
  postLikeLimiter,
  authenticateToken,
  async (req, res) => {
    const post_id = req.params.post_id;
    const user_id = req.user.id;
    try {
      // Check if already liked
      const existing = await return_sql(
        "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
        [post_id, user_id]
      );
      if (existing.length) {
        // Unlike: remove like and decrement
        await exec_sql(
          "DELETE FROM post_likes WHERE post_id = ? AND user_id = ?",
          [post_id, user_id]
        );
        await exec_sql(
          "UPDATE posts SET likes = likes - 1 WHERE post_id = ? AND likes > 0",
          [post_id]
        );
      } else {
        // Like: add like and increment
        await exec_sql(
          "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
          [post_id, user_id]
        );
        await exec_sql("UPDATE posts SET likes = likes + 1 WHERE post_id = ?", [
          post_id,
        ]);
      }
      const [{ likes }] = await return_sql(
        "SELECT likes FROM posts WHERE post_id = ?",
        [post_id]
      );
      res.json({ likes });
    } catch (err) {
      res.status(500).json({ error: "Failed to like/unlike post" });
    }
  }
);

// Like/unlike a comment
router.post(
  "/comments/:comment_id/like",
  commentLikeLimiter,
  authenticateToken,
  async (req, res) => {
    const comment_id = req.params.comment_id;
    const user_id = req.user.id;
    try {
      // Check if already liked
      const existing = await return_sql(
        "SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?",
        [comment_id, user_id]
      );
      if (existing.length) {
        // Unlike: remove like and decrement
        await exec_sql(
          "DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?",
          [comment_id, user_id]
        );
        await exec_sql(
          "UPDATE comments SET likes = likes - 1 WHERE comment_id = ? AND likes > 0",
          [comment_id]
        );
      } else {
        // Like: add like and increment
        await exec_sql(
          "INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)",
          [comment_id, user_id]
        );
        await exec_sql(
          "UPDATE comments SET likes = likes + 1 WHERE comment_id = ?",
          [comment_id]
        );
      }
      const [{ likes }] = await return_sql(
        "SELECT likes FROM comments WHERE comment_id = ?",
        [comment_id]
      );
      res.json({ likes });
    } catch (err) {
      res.status(500).json({ error: "Failed to like/unlike comment" });
    }
  }
);

module.exports = router;
