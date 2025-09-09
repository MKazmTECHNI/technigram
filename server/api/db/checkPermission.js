const express = require('express');
const router = express.Router();
const dbUtils = require('../../utils/dbUtils');
const { verifyToken } = require('../../utils/tokenUtils');

// POST /api/db/check-permission
router.post('/', async (req, res) => {
  try {
    const { id, token } = req.body;
    console.log('check-permission: received id:', id);
    console.log('check-permission: received token:', token);
    if (!id || !token) {
      console.log('check-permission: missing id or token');
      return res.status(400).json({ error: 'Missing id or token' });
    }
    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('check-permission: decoded token:', decoded);
    } catch (err) {
      console.log('check-permission: invalid token', err);
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (!decoded) {
      console.log('check-permission: decoded token is null');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (decoded.id != id) {
      console.log('check-permission: token id mismatch', decoded.id, id);
      return res.status(403).json({ error: 'Token id mismatch' });
    }
    const users = await dbUtils.return_sql('SELECT permission FROM users WHERE id=?', [id]);
    console.log('check-permission: db users result:', users);
    if (!users.length) {
      console.log('check-permission: user not found for id', id);
      return res.status(404).json({ error: 'User not found' });
    }
    const permission = users[0].permission;
    console.log('check-permission: user permission:', permission);
    if (permission === 'moderator' || permission === 'nauczyciel' || permission === 'dyrektor' || permission === 'przewodniczacy') {
      console.log('check-permission: permission allowed');
      return res.json({ allowed: true, permission });
    } else {
      console.log('check-permission: insufficient permission', permission);
      return res.status(403).json({ error: 'Insufficient permission', permission });
    }
  } catch (err) {
    console.log('check-permission: server error', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
