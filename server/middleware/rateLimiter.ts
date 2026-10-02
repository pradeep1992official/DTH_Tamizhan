import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limiter to protect against volumetric abuse
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
  },
});

/**
 * Strict rate limiter for signal refresh command pulses (prevents satellite transponder flooding)
 */
export const signalRefreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 refresh commands per 5-minute window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Signal refresh rate limit exceeded. Satellite transponder cooldown in effect. Please retry in a few minutes.',
  },
});

/**
 * Rate limiter for order creations
 */
export const orderCreateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 orders per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Order creation rate limit reached. Please wait a moment before trying again.',
  },
});

/**
 * Rate limiter for admin management actions
 */
export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Admin action rate limit reached. Please slow down your requests.',
  },
});
