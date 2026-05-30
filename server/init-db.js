const sqlite3 = require("sqlite3").verbose();

const initSql = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL,
    true_name TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    bio TEXT DEFAULT '',
    status TEXT DEFAULT '',
    banner TEXT DEFAULT '',
    links TEXT DEFAULT '[]',
    custom_css TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    timeout TIMESTAMP DEFAULT NULL,
    token TEXT,
    permission TEXT DEFAULT 'uczen'
);
CREATE TABLE IF NOT EXISTS posts (
    post_id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    image TEXT
    );
CREATE TABLE IF NOT EXISTS comments (
    comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_creator_id INTEGER NOT NULL REFERENCES users(id),
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    comment_content TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS post_likes (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER, user_id INTEGER);
CREATE TABLE IF NOT EXISTS comment_likes (id INTEGER PRIMARY KEY AUTOINCREMENT, comment_id INTEGER, user_id INTEGER);
CREATE TABLE IF NOT EXISTS allowed_emails (
    email TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    tag_id INTEGER NOT NULL REFERENCES tags(tag_id),
    PRIMARY KEY (post_id, tag_id)
);
CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id),
    following_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);
CREATE TABLE IF NOT EXISTS post_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(post_id),
    user_id INTEGER REFERENCES users(id),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_creator_created ON posts(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post ON post_likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment ON comment_likes(user_id, comment_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);`;

function initDb(callback) {
  const db = new sqlite3.Database("technigram.db");
  db.exec(initSql, (err) => {
    if (err) {
      console.error("DB init error:", err);
      if (callback) callback(err);
    } else {
      // Migration: add new columns if they don't exist
      db.run("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''", () => {});
      db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT ''", () => {});
      db.run("ALTER TABLE users ADD COLUMN banner TEXT DEFAULT ''", () => {});
      db.run("ALTER TABLE users ADD COLUMN links TEXT DEFAULT '[]'", () => {});
      db.run("ALTER TABLE users ADD COLUMN custom_css TEXT DEFAULT ''", () => {});
      // Indexes (safe to run again, IF NOT EXISTS)
      db.run("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
      db.run("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
      db.run("CREATE INDEX IF NOT EXISTS idx_users_token ON users(token)");
      db.run("CREATE INDEX IF NOT EXISTS idx_posts_creator_id ON posts(creator_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)");
      db.run("CREATE INDEX IF NOT EXISTS idx_posts_creator_created ON posts(creator_id, created_at DESC)");
      db.run("CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_post_likes_user_post ON post_likes(user_id, post_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment ON comment_likes(user_id, comment_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id)");
      console.log("Database initialized (if needed)");
      if (callback) callback(null);
    }
    db.close();
  });
}

module.exports = { initDb };
