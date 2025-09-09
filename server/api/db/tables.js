const dbUtils = require('../../utils/dbUtils');
const { checkPermission } = require('../../utils/checkPermission');
const { authenticateToken } = require("../../middleware/auth");
// const { verifyToken } = require('../../utils/tokenUtils');
const express = require('express');
const router = express.Router();

// List all tables
router.get('/', authenticateToken, async (req, res) => {
  try {
    // const token = req.headers['authorization']?.replace('Bearer ', '');
    const id = req.headers['x-user-id'];
    const perm = await checkPermission(id, ['admin', 'moderator']);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error || 'Permission denied' });
    }
    const tables = await dbUtils.return_sql("SELECT name FROM sqlite_master WHERE type='table'");
    res.json({ tables });
  } catch (err) {
    console.error('Error in GET /api/db/tables:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get table data
router.get('/:table', authenticateToken, async (req, res) => {
  try {
    const id = req.headers['x-user-id'];
    const perm = await checkPermission(id, ['admin', 'moderator']);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error || 'Permission denied' });
    }
    const table = req.params.table;
    const data = await dbUtils.return_sql(`SELECT * FROM ${table}`);
    res.json({ data });
  } catch (err) {
    console.error(`Error in GET /api/db/tables/${req.params.table}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Add entry to table
router.post('/:table', authenticateToken, async (req, res) => {
  try {
    const table = req.params.table;
    const id = req.headers['x-user-id'];
    const token = req.body.token;
    const entry = { ...req.body };
    delete entry.id;
    delete entry.token;
    const perm = await checkPermission(id, ['admin', 'moderator']);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error || 'Permission denied' });
    }
    const keys = Object.keys(entry).join(', ');
    const values = Object.values(entry).map(v => `'${v}'`).join(', ');
    await dbUtils.exec_sql(`INSERT INTO ${table} (${keys}) VALUES (${values})`);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error in POST /api/db/tables/${req.params.table}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Update entry in table
router.put('/:table/:id', authenticateToken, async (req, res) => {
  try {
    const table = req.params.table;
    const rowId = req.params.id;
    const { token, ...entry } = req.body;
    const id = req.headers['x-user-id'];
    const perm = await checkPermission(id, ['admin']);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error || 'Permission denied' });
    }
    // Detect primary key
    const sampleRow = await dbUtils.return_sql(`SELECT * FROM ${table} LIMIT 1`);
    const primaryKey = sampleRow[0]
      ? Object.keys(sampleRow[0]).find(key => key === 'id' || key.endsWith('_id')) || Object.keys(sampleRow[0])[0]
      : 'id';
    const updates = Object.keys(entry)
      .map(key => `${key}='${entry[key]}'`)
      .join(', ');
    await dbUtils.exec_sql(`UPDATE ${table} SET ${updates} WHERE ${primaryKey}="${rowId}"`);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error in PUT /api/db/tables/${req.params.table}/${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Delete entry from table
router.delete('/:table/:id', authenticateToken, async (req, res) => {
  try {
    const table = req.params.table;
    const rowId = req.params.id;
    const id = req.headers['x-user-id'];
    const perm = await checkPermission(id, ['admin', 'moderator']);
    // Fetch one row to detect primary key
    const sampleRow = await dbUtils.return_sql(`SELECT * FROM ${table} LIMIT 1`);
    const primaryKey = sampleRow[0]
      ? Object.keys(sampleRow[0]).find(key => key === 'id' || key.endsWith('_id')) || Object.keys(sampleRow[0])[0]
      : 'id';
    await dbUtils.exec_sql(`DELETE FROM ${table} WHERE ${primaryKey}=${rowId}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error in DELETE /api/db/tables/${req.params.table}/${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
