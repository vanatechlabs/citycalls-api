import { z } from 'zod';
import { HELP_NOW_EXTRA_TIME_OPTIONS, HELP_NOW_LIMITS, HELP_NOW_SERVICE_SLUGS } from './helpNowPricing';

const optionalText = (max: number) => z.string().trim().max(max).optional();
const phoneSchema = z.string().trim().regex(/^\d{10}$/, 'Phone number must be 10 digits');

// Bookings can be made from today up to this many days ahead.
export const HELP_NOW_BOOKING_WINDOW_DAYS = 60;

// Home sizes on the booking form (they suggest how many helpers to send).
export const HELP_NOW_PROPERTY_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Villa / Duplex', 'Bungalow / Estate'] as const;

export const HELP_NOW_PAYMENT_MODES = ['ONLINE', 'AFTER_SERVICE'] as const;
export type HelpNowPaymentMode = (typeof HELP_NOW_PAYMENT_MODES)[number];

// "2026-10-21" for the given moment, in India time.
export function istDateString(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

function isWithinBookingWindow(value: string, now = new Date()) {
  const latest = new Date(now.getTime() + HELP_NOW_BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return value >= istDateString(now) && value <= istDateString(latest);
}

const quoteFields = {
  serviceSlug: z.enum(HELP_NOW_SERVICE_SLUGS),
  hours: z.number().int().min(HELP_NOW_LIMITS.minHours).max(HELP_NOW_LIMITS.maxHours),
  helpers: z.number().int().min(HELP_NOW_LIMITS.minHelpers).max(HELP_NOW_LIMITS.maxHelpers),
  extraTime: z.enum(HELP_NOW_EXTRA_TIME_OPTIONS).optional(),
  couponCode: optionalText(40),
};

export const helpNowQuoteSchema = z.object(quoteFields).strict();

export const createHelpNowBookingSchema = z.object({
  ...quoteFields,
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
  phone: phoneSchema,
  altPhone: z.union([phoneSchema, z.literal('')]).optional(),
  address: z.string().trim().min(1).max(300),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  instructions: optionalText(300),
  language: optionalText(40),
  heardFrom: optionalText(60),
  propertyType: z.enum(HELP_NOW_PROPERTY_TYPES).optional(),
  // From POST .../otp/verify for the main phone (the alternate number isn't verified).
  phoneVerificationToken: z.string().min(1, 'Please verify your phone number').max(1000),
  // Task names from the service page's "what's included" list.
  tasks: z.array(z.string().trim().min(1).max(80)).min(1, 'Select at least one task').max(12),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
    .refine((value) => isWithinBookingWindow(value), `Pick a date within the next ${HELP_NOW_BOOKING_WINDOW_DAYS} days`),
  // A standard slot, "Instant (within 30-45 mins)" or "Custom: 02:30 PM".
  timeSlot: z.string().trim().min(1).max(60),
  paymentMode: z.enum(HELP_NOW_PAYMENT_MODES),
}).strict();

export type CreateHelpNowBookingInput = z.infer<typeof createHelpNowBookingSchema>;

export const verifyHelpNowPaymentSchema = z.object({
  razorpayOrderId: z.string().trim().regex(/^order_[A-Za-z0-9]{6,40}$/, 'Invalid order'),
  razorpayPaymentId: z.string().trim().regex(/^pay_[A-Za-z0-9]{6,40}$/, 'Invalid payment'),
  razorpaySignature: z.string().trim().regex(/^[a-f0-9]{64}$/, 'Invalid signature'),
}).strict();

export const requestHelpNowOtpSchema = z.object({ phone: phoneSchema }).strict();

export const verifyHelpNowOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
}).strict();
