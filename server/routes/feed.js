const express = require("express");
const { return_sql } = require("../utils/dbUtils");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const SERVER_ADDRESS = process.env.SERVER_ADDRESS;

// ForYouPage feed algorithm
router.get("/foryou", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = Math.max(0, parseInt(req.query.offset) || 0);

  try {
    // 1. Get user's tag interests (from posts they liked)
    const interestTags = await return_sql(`
      SELECT DISTINCT t.tag_id, t.name, COUNT(*) AS score
      FROM post_likes pl
      JOIN post_tags pt ON pl.post_id = pt.post_id
      JOIN tags t ON pt.tag_id = t.tag_id
      WHERE pl.user_id = ?
      GROUP BY t.tag_id
      ORDER BY score DESC
    `, [userId]);

    const tagIds = interestTags.map(t => t.tag_id);

    // 2. Get users the current user follows
    const followedUsers = await return_sql(
      "SELECT following_id FROM follows WHERE follower_id = ?",
      [userId]
    );
    const followedIds = followedUsers.map(u => u.following_id);

    // 3. Fetch candidate posts with scoring
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let posts = await return_sql(`
      SELECT p.post_id, p.content, p.creator_id, p.created_at, p.likes, p.image,
             u.username, u.true_name, u.profile_picture,
             (SELECT COUNT(*) FROM post_views pv WHERE pv.post_id = p.post_id) AS view_count
      FROM posts p
      JOIN users u ON p.creator_id = u.id
      WHERE p.post_id NOT IN (
        SELECT post_id FROM post_likes WHERE user_id = ?
      )
      ORDER BY p.created_at DESC
    `, [userId]);

    // Score each post
    const scored = posts.map(post => {
      let score = 0;

      // Recency bonus: newer posts score higher
      const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 100 - ageHours * 2);

      // Popularity bonus
      score += (post.likes || 0) * 10;
      score += (post.view_count || 0) * 2;

      // Followed user bonus
      if (followedIds.includes(post.creator_id)) {
        score += 200;
      }

      // Interest tag matching bonus
      if (tagIds.length > 0) {
        // This is simplified — in production you'd batch this
        score += 50; // placeholder for tag match
      }

      // Random discovery factor (±20%)
      score *= (0.8 + Math.random() * 0.4);

      return { ...post, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Paginate
    const total = scored.length;
    const pagePosts = scored.slice(offset, offset + limit);

    // Fetch comments for all returned posts
    const postIds = pagePosts.map(p => p.post_id);
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

    // Format response
    const result = pagePosts.map(post => {
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
        score: Math.round(post.score * 100) / 100,
      };
    });

    res.json({
      posts: result,
      total,
      offset,
      limit,
      debug: {
        interestTags: interestTags.length,
        followedUsers: followedIds.length,
        candidates: total,
      },
    });
  } catch (err) {
    console.error("Error in /foryou feed:", err);
    res.status(500).json({ error: "Failed to generate feed" });
  }
});

// Simple "latest" feed (for logged-out users / fallback)
router.get("/latest", async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = Math.max(0, parseInt(req.query.offset) || 0);

  try {
    const posts = await return_sql(`
      SELECT p.post_id, p.content, p.creator_id, p.created_at, p.likes, p.image,
             u.username, u.true_name, u.profile_picture
      FROM posts p
      JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalResult = await return_sql("SELECT COUNT(*) AS count FROM posts");
    const total = totalResult[0].count;

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
    console.error("Error in /latest feed:", err);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

module.exports = router;