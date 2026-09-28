import { z } from 'zod';
import { LAUNCH_SPOTLIGHT_STATUSES } from './launchSpotlight.model';

const imagePathSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const linkSchema = z.string().trim().min(1).max(500).refine(
  (value) => value.startsWith('/') || value.startsWith('#') || /^https?:\/\//i.test(value),
  'Link must start with /, # or http(s)://'
);

export const launchSpotlightSlideSchema = z.object({
  id: z.string().trim().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/, 'ID may contain letters, numbers, hyphens and underscores only'),
  image: imagePathSchema,
  altText: z.string().trim().min(1).max(160),
  badgeText: z.string().trim().min(1).max(40),
  heading: z.string().trim().min(1).max(80),
  subheading: z.string().trim().min(1).max(120),
  link: linkSchema,
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Accent colour must be a 6-digit hex value'),
  sortOrder: z.coerce.number().int().min(0),
  status: z.enum(LAUNCH_SPOTLIGHT_STATUSES),
}).strict();

export const updateLaunchSpotlightSchema = z.object({
  slides: z.array(launchSpotlightSlideSchema).min(1).max(12),
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
