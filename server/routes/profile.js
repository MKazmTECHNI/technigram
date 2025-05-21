const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec_sql, return_sql } = require("../utils/dbUtils");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const SERVER_ADDRESS = process.env.SERVER_ADDRESS;

// Serve static images
router.use(
  "/images",
  express.static(path.join(__dirname, "../../public/images"))
);
// Serve /profiles for direct access to /profiles/default-profile.png
router.use(
  "/profiles",
  express.static(path.join(__dirname, "../../public/images/profiles"))
);

// Multer setup for profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../public/images/profiles");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Always use user id for filename
    const userId = req.user.id;
    const ext = path.extname(file.originalname);
    const filename = `${userId}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG files are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Upload profile picture (with /profile prefix)
router.post(
  "/profile/upload-picture",
  authenticateToken,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const filePath = `/images/profiles/${req.user.id}${path.extname(
        req.file.originalname
      )}`;
      await exec_sql("UPDATE users SET profile_picture = ? WHERE id = ?", [
        filePath,
        req.user.id,
      ]);
      res.json({
        success: true,
        filePath: `${SERVER_ADDRESS}${filePath}`,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to save profile picture" });
    }
  }
);

// Get profile picture (with /profile prefix)
router.get("/profile/picture/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await return_sql(
      "SELECT profile_picture FROM users WHERE id = ?",
      [userId]
    );
    let filePath;
    if (!result.length || !result[0].profile_picture) {
      filePath = `${SERVER_ADDRESS}/images/profiles/default-profile.png`;
    } else {
      filePath = `${SERVER_ADDRESS}${result[0].profile_picture}`;
    }
    res.json({ filePath });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile picture" });
  }
});

// Get profile picture (no prefix, for compatibility)
router.get("/picture/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const result = await return_sql(
      "SELECT profile_picture FROM users WHERE id = ?",
      [userId]
    );
    let filePath;
    if (!result.length || !result[0].profile_picture) {
      filePath = `${SERVER_ADDRESS}/images/profiles/default-profile.png`;
    } else {
      filePath = `${SERVER_ADDRESS}${result[0].profile_picture}`;
    }
    res.json({ filePath });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile picture" });
  }
});

module.exports = router;
