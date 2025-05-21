const jwt = require("jsonwebtoken");

function generateToken(user) {
  const tokenPayload = { id: user.id, username: user.username };
  return jwt.sign(tokenPayload, process.env.APP_SECRET, { expiresIn: "1h" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.APP_SECRET);
  } catch {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
