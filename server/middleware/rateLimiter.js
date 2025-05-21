const rateLimit = require("express-rate-limit");

const postCommentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 15, // Limit each IP to 15 requests per window
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { postCommentLimiter };
