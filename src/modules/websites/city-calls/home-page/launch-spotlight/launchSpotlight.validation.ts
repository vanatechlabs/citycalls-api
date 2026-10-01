import { z } from 'zod';
import { DEFAULT_ACCENT_COLOR, LAUNCH_SPOTLIGHT_STATUSES, MAX_SPOTLIGHT_OVERLAY_OPACITY } from './launchSpotlight.model';

// Every field may be left empty; what is filled in still has to be valid.
const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const linkSchema = z.string().trim().max(500).refine(
  (value) => value === '' || value.startsWith('/') || value.startsWith('#') || /^https?:\/\//i.test(value),
  'Link must start with /, # or http(s)://'
);

const optionalText = (max: number) => z.string().trim().max(max).default('');

export const launchSpotlightSlideSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/, 'ID may contain letters, numbers, hyphens and underscores only'),
  image: imagePathSchema.default(''),
  altText: optionalText(160),
  badgeText: optionalText(40),
  heading: optionalText(80),
  subheading: optionalText(120),
  link: linkSchema.default(''),
  accentColor: z
    .string()
    .trim()
    .transform((value) => value || DEFAULT_ACCENT_COLOR)
    .refine((value) => /^#[0-9a-fA-F]{6}$/.test(value), 'Accent colour must be a 6-digit hex value'),
  // null = default overlay.
  overlayOpacity: z.coerce.number().int().min(0).max(MAX_SPOTLIGHT_OVERLAY_OPACITY).nullable().default(null),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(LAUNCH_SPOTLIGHT_STATUSES).default('ACTIVE'),
}).strict();

export const updateLaunchSpotlightSchema = z.object({
  slides: z.array(launchSpotlightSlideSchema).max(12),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>();
  value.slides.forEach((slide, index) => {
    if (ids.has(slide.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slides', index, 'id'],
        message: 'Every spotlight slide must have a unique ID',
      });
    }
    ids.add(slide.id);
  });
});
