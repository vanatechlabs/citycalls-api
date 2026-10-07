import { z } from 'zod';
import { ENQUIRY_STATUSES, ENQUIRY_TYPES } from './enquiry.model';

const indianMobile = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

// Website "Quick Book" form.
export const publicQuickBookingSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  phone: indianMobile,
  // One or more services, comma-separated when several are picked.
  serviceName: z.string().trim().min(1, 'Please choose a service').max(600),
  servicePath: z.string().trim().max(300).optional(),
  message: z.string().trim().max(500).optional(),
  // Page the form was sent from, for context.
  page: z.string().trim().max(300).optional(),
}).strict();

// Contact page "Send a Message" form.
export const publicContactEnquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z.string().trim().email('Enter a valid email address').max(120),
  phone: indianMobile,
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(2, 'Please write your message').max(2000),
  page: z.string().trim().max(300).optional(),
}).strict();

export const listEnquiriesQuerySchema = z.object({
  type: z.enum(ENQUIRY_TYPES),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
}).strict();
