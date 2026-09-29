import { z } from 'zod';
import { pagePathSchema } from '../seo/seoMeta.validation';
import { MAX_BACKGROUND_FEATURES, PAGE_BACKGROUND_STATUSES } from './pageBackground.model';

const imageSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded file path or an http(s) URL'
);

const featureSchema = z.object({
  title: z.string().trim().min(1, 'Feature title is required').max(40),
  subtitle: z.string().trim().max(40).optional().default(''),
}).strict();

const backgroundFields = {
  subheading: z.string().trim().max(120).optional(),
  heading: z.string().trim().min(1, 'Heading is required').max(180),
  highlight: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  features: z.array(featureSchema).max(MAX_BACKGROUND_FEATURES, `At most ${MAX_BACKGROUND_FEATURES} features`).optional(),
  image: imageSchema.optional(),
  imageAlt: z.string().trim().max(200).optional(),
  status: z.enum(PAGE_BACKGROUND_STATUSES).optional(),
};

// The highlight is coloured inside the heading, so it must appear in it.
const highlightInHeading = (value: { heading?: string; highlight?: string }) =>
  !value.heading || !value.highlight || value.heading.includes(value.highlight);
const highlightMessage = { message: 'Highlight text must be part of the heading', path: ['highlight'] };

export const createPageBackgroundSchema = z
  .object({ pagePath: pagePathSchema, ...backgroundFields })
  .strict()
  .refine(highlightInHeading, highlightMessage);

// pagePath is fixed once created — each page has one background entry.
export const updatePageBackgroundSchema = z
  .object({ ...backgroundFields, heading: backgroundFields.heading.optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' })
  .refine(highlightInHeading, highlightMessage);

export const listPageBackgroundQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PAGE_BACKGROUND_STATUSES).optional(),
}).strict();

export const publicPageBackgroundQuerySchema = z.object({ path: pagePathSchema }).strict();
