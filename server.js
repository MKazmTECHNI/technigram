const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");
const cors = require("cors");
// const { Client } = require("pg");
const sqlite3 = require("sqlite3").verbose();
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const xss = require("xss");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.APP_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

const db = new sqlite3.Database("technigram.db");

const emailPattern = /^u\d{3}_[a-z]{6}_[a-z]{3}@technischools\.com$/;

function exec_sql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Retrieve SQL query result
function return_sql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Rate Limiting
const postCommentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15-minute window
  max: (req, res) => {
    if (req.rateLimit && req.rateLimit.current > 50) {
      return 10; // Reduce max requests to 10 if user exceeds 50 in current window
    }
    return 15; // Default max requests per 15 minute
  },
  message:
    "Too many requests for posting or commenting. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip; // Limit based on user ID if available, otherwise IP
  },
  handler: (req, res) => {
    res.status(429).json({
      error:
        "You have exceeded the posting/commenting limit. Please try again later.",
    });
  },
});

const generateToken = (user) => {
  const tokenPayload = { id: user.id, username: user.username };
  const token = jwt.sign(tokenPayload, process.env.APP_SECRET, {
    expiresIn: "1h",
  });
  return token;
};

// Passport.js Google OAuth configuration

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLESTRATEGY_CLIENTID,
      clientSecret: process.env.GOOGLESTRATEGY_CLIENTSECRET,
      callbackURL: "https://technigram.onrender.com/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;

      // Validate email pattern
      if (!emailPattern.test(email)) {
        return done(null, false, { message: "Invalid email format" });
      }

      const result = await return_sql(
        `SELECT id, username, token FROM users WHERE email = ${email}`
      );

      let user;
      let token;

      // Convert image URL to Base64
      const imageUrl = profile.photos[0].value;
      const base64Image = await fetch(imageUrl)
        .then((response) => {
          if (!response.ok) throw new Error("Failed to fetch image");
          return response.arrayBuffer();
        })
        .then((arrayBuffer) => Buffer.from(arrayBuffer).toString("base64"))
        .catch((error) => {
          console.error("Error fetching image:", error);
          return null; // Or handle this as necessary
        });

      if (result.length) {
        // If token exists, use the existing token, otherwise generate a new one
        token = result[0].token ? result[0].token : generateToken(user[0]);

        // If no token existed, update the user record with the newly generated token
        if (!result[0].token) {
          exec_sql(
            `UPDATE users SET token = ${token} WHERE id = ${result[0].id}`
          ).catch((err) => {
            console.error("Error updating token:", err);
          });
        }
      } else {
        // First-time registration, insert the new user and generate a token
        returned_values = return_sql(
          `INSERT INTO users (username, email, profile_picture, true_name) 
          VALUES (${profile.displayName}, '${email}', '${base64Image}', '${profile.displayName}
          RETURNING id, username, email, true_name')`
        );

        token = generateToken(returned_values[0]);

        exec_sql(
          `UPDATE users SET token = ${token} WHERE id = ${returned_values[0].id}`
        );
      }

      // Store the token in session and return user with token
      return done(null, { ...returned_values[0], token });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, { id: user.id, username: user.username, token: user.token });
});
passport.deserializeUser(async (user, done) => {
  try {
    const result = await return_sql(
      `SELECT id, username, email, profile_picture, true_name FROM users WHERE id = ?`,
      [user.id]
    );

    if (result.length === 0) {
      return done(new Error("User not found"), null);
    }

    const dbUser = result[0];
    done(null, { ...dbUser, token: user.token });
  } catch (error) {
    console.error("Error deserializing user:", error);
    done(error, null);
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.session.token = req.user.token; // Set the token in session
    res.send(`
      <html>
        <body>
          <script>
            localStorage.setItem("currentUser", JSON.stringify({
              id: "${req.user.id}",
              username: "${req.user.username}",
              token: "${req.user.token}"
            }));
            window.location.replace("/index.html");
          </script>
        </body>
      </html>
    `);
  }
);
const checkToken = async (localToken, userId) => {
  try {
    const results = await return_sql("SELECT token FROM users WHERE id = ?", [
      userId,
    ]);
    const dbToken = results[0]?.token;
    if (dbToken === localToken) {
      return { success: true, message: "Token matches" };
    } else {
      return { success: false, message: "Token does not match" };
    }
  } catch (err) {
    console.error("Error querying database:", err);
    return { success: false, message: "Internal server error" };
  }
};

const fetchProfilePicture = async (userId) => {
  try {
    const results = await return_sql(
      "SELECT profile_picture FROM users WHERE id = ?",
      [userId]
    );
    if (results.length === 0) {
      throw new Error("User not found");
    }
    const profilePicture = results[0].profile_picture || "/default-profile.png";
    return { userProfilePicture: profilePicture };
  } catch (err) {
    console.error("Error fetching profile picture:", err);
    throw err;
  }
};

const fetchPostDetails = async (postId) => {
  try {
    const postQuery = `
      SELECT content, creator_id, created_at, likes
      FROM posts
      WHERE post_id = ?`;
    const postResults = await return_sql(postQuery, [postId]);

    if (postResults.length === 0) {
      throw new Error("Post not found");
    }
    const post = postResults[0];

    const userQuery = `
      SELECT username, profile_picture, true_name
      FROM users
      WHERE id = ?`;
    const userResults = await return_sql(userQuery, [post.creator_id]);

    if (userResults.length === 0) {
      throw new Error("User not found");
    }
    const { username, profile_picture, true_name } = userResults[0];

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

    return {
      content: post.content,
      creator_id: post.creator_id,
      creatorUsername: username,
      trueName: true_name,
      creatorProfilePicture: profile_picture,
      likes: post.likes,
      date: post.created_at,
      comments,
    };
  } catch (error) {
    console.error("Error fetching post details:", error);
    throw error;
  }
};

app.get("/posts/count", async (req, res) => {
  try {
    const results = await return_sql("SELECT COUNT(*) AS count FROM posts");
    const numberOfPosts = results[0].count;
    res.json({ numberOfPosts });
  } catch (err) {
    console.error("Error fetching post count:", err);
    res.status(500).json({ error: "Failed to fetch post count" });
  }
});

app.get("/profilePicture/:user_id", async (req, res) => {
  try {
    const userId = req.params.user_id;
    const profilePicture = await fetchProfilePicture(userId);
    res.json(profilePicture);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch profile picture" });
  }
});

app.post("/changeProfile", async (req, res) => {
  const authHeader = req.headers.authorization;
  const localToken = authHeader && authHeader.split(" ")[1];
  const { username, email } = req.body;

  if (!localToken) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const tokenResult = await return_sql(
      `SELECT id FROM users WHERE token = ?`,
      [localToken]
    );

    if (tokenResult.length === 0) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const userId = tokenResult[0].id;

    await exec_sql(`UPDATE users SET username = ?, email = ? WHERE id = ?`, [
      username,
      email,
      userId,
    ]);

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile information" });
  }
});

app.post("/changeUsername", async (req, res) => {
  const authHeader = req.headers.authorization;
  const localToken = authHeader && authHeader.split(" ")[1];
  const { userId, username } = req.body;

  if (!localToken) {
    return res
      .status(401)
      .json({ success: false, message: "Token not provided" });
  }

  const result = await checkToken(localToken, userId);

  if (!result.success) {
    return res
      .status(result.message === "Token does not match" ? 401 : 500)
      .json(result);
  }

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
    console.error("Error updating username:", err);
    res.status(500).json({ error: "Failed to update username" });
  }
});

app.get("/posts/:post_id", async (req, res) => {
  const post_id = req.params.post_id;

  try {
    const postDetails = await fetchPostDetails(post_id);
    res.json(postDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/posts/:post_id/comments", postCommentLimiter, async (req, res) => {
  const post_id = req.params.post_id;
  const { comment_content, comment_creator_id } = req.body;

  const authHeader = req.headers.authorization;
  const localToken = authHeader && authHeader.split(" ")[1];

  if (!localToken) {
    return res
      .status(401)
      .json({ success: false, message: "Token not provided" });
  }

  const result = await checkToken(localToken, comment_creator_id);
  if (!result.success) {
    return res
      .status(result.message === "Token does not match" ? 401 : 500)
      .json(result);
  }

  if (!comment_content || !comment_creator_id) {
    return res
      .status(400)
      .json({ error: "Comment content and creator ID are required" });
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

    const userResult = await return_sql(
      `SELECT username FROM users WHERE id = ?`,
      [comment_creator_id]
    );

    if (userResult.length === 0) {
      return res.status(500).json({ error: "Failed to fetch user info" });
    }

    const { username } = userResult[0];
    res.json({
      comment_id: insertResult.lastID,
      comment_creator_id,
      comment_content: sanitizedCommentContent,
      username,
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// GET USER USERNAME BY ID
app.get("/users/:user_id", async (req, res) => {
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
    console.error("Error fetching user details:", err);
    res.status(500).json({ error: "Failed to fetch user details" });
  }
});

// POST A POST
app.post("/posts", postCommentLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  const localToken = authHeader && authHeader.split(" ")[1];
  const { creator_id, content } = req.body;

  if (!localToken) {
    return res
      .status(401)
      .json({ success: false, message: "Token not provided" });
  }

  const result = await checkToken(localToken, creator_id);

  if (!result.success) {
    return res
      .status(result.message === "Token does not match" ? 401 : 500)
      .json(result);
  }

  if (!creator_id || !content) {
    return res
      .status(400)
      .json({ error: "Creator ID and content are required" });
  }

  if (content.length > 1500) {
    return res
      .status(400)
      .json({ error: "Content cannot exceed 1500 characters" });
  }

  try {
    const insertResult = await exec_sql(
      `INSERT INTO posts (creator_id, content) VALUES (?, ?)`,
      [creator_id, content]
    );

    res.status(201).json({
      post_id: insertResult.lastID,
      creator_id,
      content,
      likes: 0,
      created_at: new Date(),
    });
  } catch (err) {
    console.error("Error adding post:", err);
    res.status(500).json({ error: "Failed to add post" });
  }
});

app.get("/healthcheck", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`Server is running at`, process.env.SERVER_ADDRESS);
});
