const { return_sql } = require("../utils/dbUtils");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const result = await return_sql(
      "SELECT id, username FROM users WHERE token = ?",
      [token]
    );
    if (!result.length) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = result[0]; // Attach user info to the request
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error during authentication" });
  }
}

module.exports = { authenticateToken };
