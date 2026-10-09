import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Limits per docs/17-security-and-audit.md §4.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // per IP; per-identifier limiting is layered on top in auth.service if needed
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    data: null,
    errors: [{ field: 'general', code: 'RATE_LIMITED', message: 'Too many login attempts' }],
  },
});

// Per docs/17-security-and-audit.md §4: 3/10min per mobile number, ideally — this is
// IP-scoped for now (express-rate-limit's default keying); per-identifier limiting
// would need a custom store keyed by request body, not yet built.
// Request AND verify both count, so 5 is only ~2 logins — fine for production,
// but it silently stops OTPs during local testing; development allows 50.
export const otpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.',
    data: null,
    errors: [{ field: 'general', code: 'RATE_LIMITED', message: 'Too many OTP requests' }],
  },
});

export const generalApiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    data: null,
    errors: [{ field: 'general', code: 'RATE_LIMITED', message: 'Too many requests' }],
  },
});

// Unauthenticated website booking form — a real customer books a handful of
// services at most, so anything beyond this per IP is spam.
export const publicBookingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many bookings from this network. Please try again later or call us.',
    data: null,
    errors: [{ field: 'general', code: 'RATE_LIMITED', message: 'Too many bookings' }],
  },
});

export const publicApiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    data: null,
    errors: [{ field: 'general', code: 'RATE_LIMITED', message: 'Too many requests' }],
  },
});
