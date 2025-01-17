const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");
const cors = require("cors");
const { Client } = require("pg");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const xss = require("xss");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = 3005;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "")));

app.use(
  session({
    secret: process.env.APP_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

const emailPattern = /^u\d{3}_[a-z]{6}_[a-z]{3}@technischools\.com$/;

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// PostgreSQL configuration
const connectionString = process.env.DATABASE_CONNECTION_STRING;

const sslConfig = {
  rejectUnauthorized: false,
};

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

      const client = new Client({
        connectionString: connectionString,
        ssl: sslConfig,
      });

      try {
        await client.connect();

        const selectUserQuery = {
          text: "SELECT id, username, token FROM users WHERE email = $1",
          values: [email],
        };

        const result = await client.query(selectUserQuery);

        let user;
        let token;

        // Convert image URL to Base64
        const imageUrl = profile.photos[0].value;
        const base64Image = await fetch(imageUrl)
          .then((response) => response.buffer())
          .then((buffer) => buffer.toString("base64"));

        if (result.rows.length > 0) {
          user = result.rows[0];

          // If token exists, use the existing token, otherwise generate a new one
          token = user.token ? user.token : generateToken(user);

          // If no token existed, update the user record with the newly generated token
          if (!user.token) {
            const updateTokenQuery = {
              text: "UPDATE users SET token = $1 WHERE id = $2",
              values: [token, user.id],
            };
            await client.query(updateTokenQuery);
          }
        } else {
          // First-time registration, insert the new user and generate a token
          const insertUserQuery = {
            text: `
              INSERT INTO users (username, email, profile_picture)
              VALUES ($1, $2, $3)
              RETURNING id, username, email
            `,
            values: [profile.displayName, email, base64Image],
          };

          const insertResult = await client.query(insertUserQuery);
          user = insertResult.rows[0];
          token = generateToken(user);

          const updateTokenQuery = {
            text: "UPDATE users SET token = $1 WHERE id = $2",
            values: [token, user.id],
          };
          await client.query(updateTokenQuery);
        }

        // Store the token in session and return user with token
        return done(null, { ...user, token });
      } catch (err) {
        console.error("Error handling Google login:", err);
        return done(err, null);
      } finally {
        await client.end();
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user); // Debugging log
  done(null, { id: user.id, username: user.username, token: user.token });
});

passport.deserializeUser(async (user, done) => {
  console.log("Deserializing user:", user); // Debugging log
  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const selectUserQuery = {
      text: "SELECT id, username FROM users WHERE id = $1",
      values: [user.id],
    };

    const result = await client.query(selectUserQuery);
    const dbUser = result.rows[0];

    done(null, { dbUser, token: user.token });
  } catch (err) {
    done(err, null);
  } finally {
    await client.end();
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

const checkToken = async (localToken, userId, connectionString, sslConfig) => {
  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const queryResult = await client.query(
      "SELECT token FROM users WHERE id = $1",
      [userId]
    );
    const dbToken = queryResult.rows[0]?.token;
    if (dbToken === localToken) {
      return { success: true, message: "Token matches" };
    } else {
      return { success: false, message: "Token does not match" };
    }
  } catch (error) {
    console.error("Error querying database:", error);
    return { success: false, message: "Internal server error" };
  } finally {
    await client.end();
  }
};

async function fetchProfilePicture(user_id) {
  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const selectUserQuery = {
      text: `
        SELECT profile_picture FROM users
        WHERE id = $1
      `,
      values: [user_id],
    };

    const userResult = await client.query(selectUserQuery);
    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }
    const { profile_picture } = userResult.rows[0];

    return {
      userProfilePicture: profile_picture || "/default-profile.png", // Provide a default if not set
    };
  } catch (err) {
    console.error("Error fetching data from PostgreSQL:", err);
    throw err;
  } finally {
    await client.end();
  }
}

async function fetchPostDetails(post_id) {
  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const selectPostQuery = {
      text: `
        SELECT title, content, creator_id, likes FROM posts
        WHERE post_id = $1
      `,
      values: [post_id],
    };

    const postResult = await client.query(selectPostQuery);
    if (postResult.rows.length === 0) {
      throw new Error("Post not found");
    }
    const post = postResult.rows[0];

    const selectUserQuery = {
      text: `
        SELECT username, profile_picture FROM users
        WHERE id = $1
      `,
      values: [post.creator_id],
    };

    const userResult = await client.query(selectUserQuery);
    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }
    const { username, profile_picture } = userResult.rows[0];

    const selectCommentsQuery = {
      text: `
        SELECT comment_creator_id, comment_content FROM comments
        WHERE post_id = $1
      `,
      values: [post_id],
    };

    const commentsResult = await client.query(selectCommentsQuery);
    const comments = await Promise.all(
      commentsResult.rows.map(async (comment) => {
        const selectCommentUserQuery = {
          text: `
          SELECT username, profile_picture FROM users
          WHERE id = $1
        `,
          values: [comment.comment_creator_id],
        };
        const commentUserResult = await client.query(selectCommentUserQuery);
        const {
          username: commentUsername,
          profile_picture: commentProfilePicture,
        } = commentUserResult.rows[0];

        return {
          ...comment,
          username: commentUsername,
          profile_picture: commentProfilePicture,
        };
      })
    );

    return {
      title: post.title,
      content: post.content,
      creator_id: post.creator_id,
      creatorUsername: username,
      creatorProfilePicture: profile_picture,
      likes: post.likes,
      comments: comments,
    };
  } catch (err) {
    console.error("Error fetching data from PostgreSQL:", err);
    throw err;
  } finally {
    await client.end();
  }
}

app.get("/posts/count", async (req, res) => {
  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const countQuery = "SELECT COUNT(*) FROM posts";
    const result = await client.query(countQuery);
    const numberOfPosts = parseInt(result.rows[0].count);

    res.json({ numberOfPosts });
  } catch (err) {
    console.error("Error fetching post count:", err);
    res.status(500).json({ error: "Failed to fetch post count" });
  } finally {
    await client.end();
  }
});

app.get("/profilePicture/:user_id", async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const profilePicture = await fetchProfilePicture(user_id);
    res.json(profilePicture);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile picture" });
  }
});

app.post("/changeProfile", async (req, res) => {
  const authHeader = req.headers.authorization;
  const localToken = authHeader && authHeader.split(" ")[1];
  const { userId, profilePicture } = req.body;

  if (!localToken) {
    return res
      .status(401)
      .json({ success: false, message: "Token not provided" });
  }

  const result = await checkToken(
    localToken,
    userId,
    connectionString,
    sslConfig
  );

  if (!result.success) {
    return res
      .status(result.message === "Token does not match" ? 401 : 500)
      .json(result);
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const updateProfilePictureQuery = {
      text: `
        UPDATE users
        SET profile_picture = $1
        WHERE id = $2
      `,
      values: [profilePicture, userId],
    };

    await client.query(updateProfilePictureQuery);

    res.status(200).json({ message: "Profile picture updated successfully" });
  } catch (err) {
    console.error("Error updating profile picture:", err);
    res.status(500).json({ error: "Failed to update profile picture" });
  } finally {
    await client.end();
  }
});

app.get("/posts/:post_id", async (req, res) => {
  const post_id = req.params.post_id;

  try {
    const postDetails = await fetchPostDetails(post_id);
    res.json(postDetails);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post details" });
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

  // Validate the token using comment_creator_id instead of user_id
  const result = await checkToken(
    localToken,
    comment_creator_id,
    connectionString,
    sslConfig
  );
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

  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const insertCommentQuery = {
      text: `
        INSERT INTO comments (post_id, comment_creator_id, comment_content)
        VALUES ($1, $2, $3)
        RETURNING comment_id, comment_creator_id, comment_content
      `,
      values: [post_id, comment_creator_id, sanitizedCommentContent],
    };

    const insertResult = await client.query(insertCommentQuery);
    const newComment = insertResult.rows[0];

    const selectCommentUserQuery = {
      text: `
        SELECT username FROM users
        WHERE id = $1
      `,
      values: [newComment.comment_creator_id],
    };

    const commentUserResult = await client.query(selectCommentUserQuery);
    const commentUsername = commentUserResult.rows[0].username;

    res.json({
      ...newComment,
      username: commentUsername,
    });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  } finally {
    await client.end();
  }
});

// GET USER USERNAME BY ID
app.get("/users/:user_id", async (req, res) => {
  const user_id = req.params.user_id;

  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const selectUserQuery = {
      text: `
        SELECT username FROM users
        WHERE id = $1
      `,
      values: [user_id],
    };

    const userResult = await client.query(selectUserQuery);
    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const user = userResult.rows[0];
    res.json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Failed to fetch user details" });
  } finally {
    await client.end();
  }
});

// POST A POST
app.post("/posts", postCommentLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  const localToken = authHeader && authHeader.split(" ")[1];
  const { creator_id, title, content } = req.body;

  if (!localToken) {
    return res
      .status(401)
      .json({ success: false, message: "Token not provided" });
  }

  // Use creator_id for token validation
  const result = await checkToken(
    localToken,
    creator_id,
    connectionString,
    sslConfig
  );

  if (!result.success) {
    return res
      .status(result.message === "Token does not match" ? 401 : 500)
      .json(result);
  }

  if (!creator_id || !title || !content) {
    return res
      .status(400)
      .json({ error: "Creator ID, title, and content are required" });
  }

  if (content.length > 1500) {
    return res
      .status(400)
      .json({ error: "Content cannot exceed 1500 characters" });
  }

  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    // Additional logic (such as user activity check) goes here...

    const insertPostQuery = {
      text: `
        INSERT INTO posts (creator_id, title, content)
        VALUES ($1, $2, $3)
        RETURNING post_id, creator_id, title, content, likes, created_at
      `,
      values: [creator_id, title, content],
    };

    const insertResult = await client.query(insertPostQuery);
    const newPost = insertResult.rows[0];

    res.status(201).json(newPost);
  } catch (err) {
    console.error("Error adding post:", err);
    res.status(500).json({ error: "Failed to add post" });
  } finally {
    await client.end();
  }
});

app.get("/reset-seq", async (req, res) => {
  const client = new Client({
    connectionString: connectionString,
    ssl: sslConfig,
  });

  try {
    await client.connect();

    const resetCommentSeqQuery = `
      SELECT setval('public.comments_comment_id_seq', (SELECT MAX(comment_id) FROM comments));
    `;
    const resetUserSeqQuery = `
      SELECT setval('public.users_id_seq', (SELECT MAX(id) FROM users));
    `;
    const resetPostSeqQuery = `
      SELECT setval('public.posts_post_id_seq', (SELECT MAX(post_id) FROM posts));
    `;

    await client.query(resetCommentSeqQuery);
    await client.query(resetUserSeqQuery);
    await client.query(resetPostSeqQuery);

    res.status(200).json({ message: "Sequences reset successfully" });
  } catch (err) {
    console.error("Error resetting sequences:", err);
    res.status(500).json({ error: "Failed to reset sequences" });
  } finally {
    await client.end();
  }
});

app.get("/healthcheck", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`Server is running at`, process.env.SERVER_ADRESS);
});
