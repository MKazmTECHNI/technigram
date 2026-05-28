const { return_sql } = require('./dbUtils');
const jwt = require("jsonwebtoken");

function generateToken(user) {
  const tokenPayload = { id: user.id, username: user.username };
  return jwt.sign(tokenPayload, process.env.APP_SECRET, { expiresIn: "7d" });
}

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.APP_SECRET);
    const users = await return_sql('SELECT id, username, permission FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return { error: 'invalid', details: 'User not found' };
    }
    return { id: users[0].id, username: users[0].username, permission: users[0].permission };
  } catch (err) {
    return { error: 'invalid', details: err.message };
  }
}

module.exports = { generateToken, verifyToken };
