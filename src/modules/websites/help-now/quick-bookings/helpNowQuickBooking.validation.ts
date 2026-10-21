import { z } from 'zod';
import { HELP_NOW_SERVICES } from '../bookings/helpNowPricing';
import { HELP_NOW_QUICK_BOOKING_STATUSES } from './helpNowQuickBooking.model';

// What the form can ask for: a Help Now service, or a call back to decide.
export const HELP_NOW_QUICK_BOOKING_NOT_SURE = 'Not sure — please call me';
export const HELP_NOW_QUICK_BOOKING_SERVICES = [
  ...Object.values(HELP_NOW_SERVICES).map((service) => service.name),
  HELP_NOW_QUICK_BOOKING_NOT_SURE,
] as string[];

const indianMobile = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

export const publicHelpNowQuickBookingSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  phone: indianMobile,
  services: z
    .array(z.string().trim().refine((name) => HELP_NOW_QUICK_BOOKING_SERVICES.includes(name), 'Unknown Help Now service'))
    .min(1, 'Please choose at least one service')
    .max(HELP_NOW_QUICK_BOOKING_SERVICES.length)
    .transform((services) => [...new Set(services)]),
  message: z.string().trim().max(500).optional(),
  page: z.string().trim().max(300).optional(),
}).strict();

export type PublicHelpNowQuickBookingInput = z.infer<typeof publicHelpNowQuickBookingSchema>;

export const updateHelpNowQuickBookingStatusSchema = z.object({
  status: z.enum(HELP_NOW_QUICK_BOOKING_STATUSES),
}).strict();
