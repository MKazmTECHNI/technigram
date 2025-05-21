const rateLimit = require("express-rate-limit");

// Custom handler for JSON error response
const jsonRateLimitHandler = (req, res, next, options) => {
  res.status(options.statusCode || 429).json({
    error: options.message || "Too many requests. Please try again later.",
    muted: true,
    retryAfter: Math.ceil((options.windowMs || 0) / 1000), // seconds
  });
};

const postCommentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 15,
  message: "T-too many comments! Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const postLikeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many like/unlike actions. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const commentLikeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: "Too many comment like/unlike actions. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const profilePicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many profile picture changes. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = {
  postCommentLimiter,
  postLikeLimiter,
  commentLikeLimiter,
  profilePicLimiter,
};
