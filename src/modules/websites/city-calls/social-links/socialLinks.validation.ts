import { z } from 'zod';

// Empty clears the link (its icon is hidden on the website).
const socialUrl = z.string().trim().max(500).refine(
  (value) => value === '' || /^https?:\/\/[^\s<>"']+$/i.test(value),
  'Must be a full http(s) URL'
);

// Spaces and dashes are dropped before checking, so "+91 98765-43210" is fine.
const stripSeparators = (value: string) => value.replace(/[\s-]/g, '');

export const updateSocialLinksSchema = z.object({
  facebook: socialUrl.optional(),
  instagram: socialUrl.optional(),
  twitter: socialUrl.optional(),
  linkedin: socialUrl.optional(),
  youtube: socialUrl.optional(),
  whatsappNumber: z
    .string()
    .transform(stripSeparators)
    .refine((value) => value === '' || /^\d{10,15}$/.test(value), 'WhatsApp number must be 10–15 digits with country code, no +')
    .optional(),
  whatsappMessage: z.string().trim().max(500).optional(),
  callNumber: z
    .string()
    .transform(stripSeparators)
    .refine((value) => value === '' || /^\+?\d{10,15}$/.test(value), 'Call number must be 10–15 digits, optionally starting with +')
    .optional(),
}).strict();
