import rateLimit from 'express-rate-limit';

/**
 * Common configuration for express-rate-limit behind Cloud Run / Google Cloud Load Balancer proxies.
 * The default key generator uses req.ip and normalizes IPv6 addresses safely.
 */
const commonRateLimitOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Standard API rate limiter to protect against volumetric abuse
 */
export const apiLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
  },
});

/**
 * Rate limiter for order creations
 */
export const orderCreateLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 orders per minute
  message: {
    success: false,
    error: 'Order creation rate limit reached. Please wait a moment before trying again.',
  },
});

/**
 * Rate limiter for admin management actions
 */
export const adminLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 80,
  message: {
    success: false,
    error: 'Admin action rate limit reached. Please slow down your requests.',
  },
});
