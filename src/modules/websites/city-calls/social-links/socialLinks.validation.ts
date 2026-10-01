import { z } from 'zod';

// Empty clears the link (its icon is hidden on the website). "facebook.com/x"
// is saved as "https://facebook.com/x".
const socialUrl = z
  .string()
  .trim()
  .max(500)
  .transform((value) => (value && !/^[a-z][a-z0-9+.-]*:/i.test(value) ? `https://${value}` : value))
  .refine((value) => value === '' || /^https?:\/\/[^\s<>"']+\.[^\s<>"']+$/i.test(value), 'Must be a website link, e.g. https://facebook.com/citycalls');

// Spaces and dashes are dropped before checking, so "+91 98765-43210" is fine.
const stripSeparators = (value: string) => value.replace(/[\s-]/g, '');

// A plain 10-digit Indian mobile gets the 91 country code wa.me / tel: need.
const withIndiaCode = (value: string) => (/^\d{10}$/.test(value) ? `91${value}` : value);

export const updateSocialLinksSchema = z.object({
  facebook: socialUrl.optional(),
  instagram: socialUrl.optional(),
  twitter: socialUrl.optional(),
  linkedin: socialUrl.optional(),
  youtube: socialUrl.optional(),
  whatsappNumber: z
    .string()
    .transform((value) => withIndiaCode(stripSeparators(value).replace(/^\+/, '')))
    .refine((value) => value === '' || /^\d{10,15}$/.test(value), 'WhatsApp number must be 10–15 digits')
    .optional(),
  whatsappMessage: z.string().trim().max(500).optional(),
  callNumber: z
    .string()
    .transform((value) => {
      const digits = stripSeparators(value);
      if (/^\d{10}$/.test(digits)) return `+91${digits}`;
      return /^91\d{10}$/.test(digits) ? `+${digits}` : digits;
    })
    .refine((value) => value === '' || /^\+?\d{10,15}$/.test(value), 'Call number must be 10–15 digits, optionally starting with +')
    .optional(),
}).strict();
