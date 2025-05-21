const express = require("express");
const { return_sql } = require("../utils/dbUtils");

const router = express.Router();

router.get("/changelog", async (req, res) => {
  try {
    const entries = await return_sql(
      `SELECT id, title, COALESCE(version, '1.0.0') as version, description, created_at FROM changelog ORDER BY created_at DESC`
    );
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch changelog" });
  }
});

module.exports = router;
