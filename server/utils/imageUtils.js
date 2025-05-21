const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../images/profiles"));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

// Middleware for uploading and compressing profile pictures
const uploadProfilePicture = [
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const filePath = req.file.path;
      const compressedPath = `${filePath}-compressed.jpg`;

      // Compress and resize the image
      await sharp(filePath)
        .resize(128, 128)
        .jpeg({ quality: 80 })
        .toFile(compressedPath);

      // Delete the original file
      fs.unlinkSync(filePath);

      // Respond with the file path
      res.json({
        success: true,
        filePath: `/images/profiles/${path.basename(compressedPath)}`,
      });
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  },
];

module.exports = { uploadProfilePicture };
