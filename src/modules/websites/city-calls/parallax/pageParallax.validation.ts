import { z } from 'zod';
import { pagePathSchema } from '../seo/seoMeta.validation';
import { PAGE_PARALLAX_STATUSES } from './pageParallax.model';

const imageSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded file path or an http(s) URL'
);

const parallaxFields = {
  subheading: z.string().trim().max(120).optional(),
  heading: z.string().trim().min(1, 'Heading is required').max(180),
  highlight: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  image: imageSchema.optional(),
  imageAlt: z.string().trim().max(200).optional(),
  status: z.enum(PAGE_PARALLAX_STATUSES).optional(),
};

// The highlight is coloured inside the heading, so it must appear in it.
const highlightInHeading = (value: { heading?: string; highlight?: string }) =>
  !value.heading || !value.highlight || value.heading.includes(value.highlight);
const highlightMessage = { message: 'Highlight text must be part of the heading', path: ['highlight'] };

export const createPageParallaxSchema = z
  .object({ pagePath: pagePathSchema, ...parallaxFields })
  .strict()
  .refine(highlightInHeading, highlightMessage);

// pagePath is fixed once created — each page has one parallax entry.
export const updatePageParallaxSchema = z
  .object({ ...parallaxFields, heading: parallaxFields.heading.optional() })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' })
  .refine(highlightInHeading, highlightMessage);

export const publicPageParallaxQuerySchema = z.object({ path: pagePathSchema }).strict();
