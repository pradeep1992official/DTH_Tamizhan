import rateLimit from 'express-rate-limit';

/**
 * Common configuration for express-rate-limit behind Cloud Run / Google Cloud Load Balancer proxies.
 * Disables unexpected X-Forwarded-For and Forwarded header validation warnings and provides a safe keyGenerator.
 */
const commonRateLimitOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  keyGenerator: (req: any): string => {
    return (
      req.ip ||
      (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].toString().split(',')[0].trim() : '') ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  },
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
 * Strict rate limiter for signal refresh command pulses (prevents satellite transponder flooding)
 */
export const signalRefreshLimiter = rateLimit({
  ...commonRateLimitOptions,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 refresh commands per 5-minute window per IP
  message: {
    success: false,
    error: 'Signal refresh rate limit exceeded. Satellite transponder cooldown in effect. Please retry in a few minutes.',
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
