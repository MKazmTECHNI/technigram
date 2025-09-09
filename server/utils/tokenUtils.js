const { return_sql } = require('./dbUtils');
const jwt = require("jsonwebtoken");

function generateToken(user) {
  const tokenPayload = { id: user.id, username: user.username };
  // No expiresIn: tokens never expire
  return jwt.sign(tokenPayload, process.env.APP_SECRET);
}

function verifyToken(id, token) {
  try {
    // Ignore expiration errors: treat expired tokens as valid
    const decoded = jwt.verify(token, process.env.APP_SECRET, { ignoreExpiration: true });
    const data = return_sql('SELECT * FROM users WHERE token = ?', [token]);
    if (data.length === 0) {
      return { error: 'invalid', details: 'Token not found in database' };
    }
  } catch (err) {
    console.log('verifyToken: invalid token', err);
    return { error: 'invalid', details: err };
  }
}

module.exports = { generateToken, verifyToken };
