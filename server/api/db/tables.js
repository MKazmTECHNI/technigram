const dbUtils = require('../../utils/dbUtils');
const { checkPermission } = require('../../utils/checkPermission');
const { authenticateToken } = require("../../middleware/auth");
const express = require('express');
const router = express.Router();

// Get list of all table names from sqlite_master for validation
async function getValidTables() {
  const tables = await dbUtils.return_sql("SELECT name FROM sqlite_master WHERE type='table'");
  return tables.map(t => t.name);
}

// Validate a table name is a real table (prevents SQL injection)
async function validateTable(tableName) {
  const validTables = await getValidTables();
  return validTables.includes(tableName);
}

// Detect primary key for a table
async function detectPrimaryKey(table) {
  const sampleRow = await dbUtils.return_sql(`SELECT * FROM "${table}" LIMIT 1`);
  if (!sampleRow[0]) return 'id';
  return Object.keys(sampleRow[0]).find(key => key === 'id' || key.endsWith('_id')) || Object.keys(sampleRow[0])[0];
}

// List all tables
router.get('/', authenticateToken, async (req, res) => {
  try {
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
    if (!(await validateTable(table))) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    const data = await dbUtils.return_sql(`SELECT * FROM "${table}"`);
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
    if (!(await validateTable(table))) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    const id = req.headers['x-user-id'];
    const perm = await checkPermission(id, ['admin', 'moderator']);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error || 'Permission denied' });
    }
    const entry = { ...req.body };
    delete entry.token;

    const keys = Object.keys(entry);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(entry);

    await dbUtils.exec_sql(`INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`, values);
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
    if (!(await validateTable(table))) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    const { token, ...entry } = req.body;
    const id = req.headers['x-user-id'];
    const perm = await checkPermission(id, ['admin']);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error || 'Permission denied' });
    }
    const primaryKey = await detectPrimaryKey(table);
    const setClauses = Object.keys(entry).map(key => `"${key}" = ?`).join(', ');
    const values = [...Object.values(entry), rowId];
    await dbUtils.exec_sql(`UPDATE "${table}" SET ${setClauses} WHERE "${primaryKey}" = ?`, values);
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
    if (!(await validateTable(table))) {
      return res.status(400).json({ error: 'Invalid table name' });
    }
    const id = req.headers['x-user-id'];
    const perm = await checkPermission(id, ['admin', 'moderator']);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error || 'Permission denied' });
    }
    const primaryKey = await detectPrimaryKey(table);
    await dbUtils.exec_sql(`DELETE FROM "${table}" WHERE "${primaryKey}" = ?`, [rowId]);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error in DELETE /api/db/tables/${req.params.table}/${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;