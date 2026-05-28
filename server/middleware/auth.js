const jwt = require("jsonwebtoken");
const { return_sql } = require("../utils/dbUtils");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  // Try JWT verification first (production flow)
  try {
    const decoded = jwt.verify(token, process.env.APP_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    return next();
  } catch {
    // JWT verification failed — fall back to DB token lookup (legacy/manual tokens)
  }

  try {
    const result = await return_sql(
      "SELECT id, username FROM users WHERE token = ?",
      [token]
    );
    if (!result.length) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = { ...result[0], id: Number(result[0].id) };
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error during authentication" });
  }
}

module.exports = { authenticateToken };