import { z } from 'zod';
import { FEATURE_ICONS, FEATURES_STATUSES, MAX_FEATURE_ITEMS } from './features.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const optionalText = (max: number) => z.string().trim().max(max).default('');

export const featureItemSchema = z.object({
  icon: z.enum(FEATURE_ICONS).default('wrench'),
  title: z.string().trim().min(1, 'Every feature card needs a title').max(60),
  description: optionalText(200),
}).strict();

export const updateFeaturesSchema = z.object({
  // Lines are kept; blank lines and stray spaces around them are dropped.
  heading: z
    .string()
    .max(200)
    .transform((value) => value.split('\n').map((line) => line.trim()).filter(Boolean).join('\n'))
    .refine((value) => value.length > 0, 'Heading is required'),
  highlight: optionalText(120),
  description: optionalText(600),
  image: imagePathSchema.default(''),
  imageAlt: optionalText(200),
  imageBadge: optionalText(40),
  items: z.array(featureItemSchema).max(MAX_FEATURE_ITEMS),
  status: z.enum(FEATURES_STATUSES).default('ACTIVE'),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export type UpdateFeaturesInput = z.infer<typeof updateFeaturesSchema>;
