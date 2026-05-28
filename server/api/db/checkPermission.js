const express = require('express');
const router = express.Router();
const dbUtils = require('../../utils/dbUtils');
const jwt = require('jsonwebtoken');

// POST /api/db/check-permission
router.post('/', async (req, res) => {
  try {
    const { id, token } = req.body;
    if (!id || !token) {
      return res.status(400).json({ error: 'Missing id or token' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.APP_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (Number(decoded.id) !== Number(id)) {
      return res.status(403).json({ error: 'Token id mismatch' });
    }
    const users = await dbUtils.return_sql('SELECT permission FROM users WHERE id=?', [id]);
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const permission = users[0].permission;
    if (permission === 'moderator' || permission === 'nauczyciel' || permission === 'dyrektor' || permission === 'przewodniczacy') {
      return res.json({ allowed: true, permission });
    } else {
      return res.status(403).json({ error: 'Insufficient permission', permission });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;