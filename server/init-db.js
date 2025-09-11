const sqlite3 = require('sqlite3').verbose();


const initSql = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL,
    true_name TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    profile_picture TEXT,
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
            `;
            
function initDb(callback) {
  const db = new sqlite3.Database("technigram.db")
  db.exec(initSql, (err) => {
    if (err) {
      console.error('DB init error:', err);
      if (callback) callback(err);
    } else {
      console.log('Database initialized (if needed)');
      if (callback) callback(null);
    }
    db.close();
  });
}

module.exports = { initDb };
