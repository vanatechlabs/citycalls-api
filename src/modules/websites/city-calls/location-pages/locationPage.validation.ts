import { Types } from 'mongoose';
import { z } from 'zod';
import { imagePathSchema, schemaMarkupSchema, slugSchema } from '../blogs/blogs.validation';
import { LOCATION_PAGE_STATUSES, LOCATION_PAGE_TYPES } from './locationPage.model';

// Location pages live at the site root (citycalls.in/<slug>), so a slug can't
// take the place of one of the website's own pages.
export const RESERVED_LOCATION_SLUGS = [
  'about', 'blogs', 'contact', 'privacy', 'terms', 'services', 'api', 'admin', 'assets', 'uploads', 'sitemap', 'robots',
];

const locationSlugSchema = slugSchema.refine(
  (value) => !RESERVED_LOCATION_SLUGS.includes(value),
  'This URL is already used by a website page — please change it.'
);

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid id');
const text = (max: number) => z.string().trim().max(max);

const featureSchema = z.object({
  title: z.string().trim().min(1, 'Feature title is required').max(40),
  subtitle: text(40).default(''),
}).strict();

const fields = {
  pageType: z.enum(LOCATION_PAGE_TYPES),
  // Required for SERVICE pages (checked below / in the service).
  navServiceId: objectId.nullable(),
  location: z.string().trim().min(2, 'Location / city is required').max(80),
  slug: locationSlugSchema,
  heroEyebrow: text(80),
  title: z.string().trim().min(3, 'Page title (H1) is required').max(200),
  highlight: text(100),
  shortDescription: z.string().trim().min(10, 'Short summary is required').max(700),
  features: z.array(featureSchema).max(4),
  heroImage: imagePathSchema,
  heroImageAlt: text(200),
  highlightedHeading: text(200),
  content: z.string().min(1, 'Page content is required').max(200_000),
  metaTitle: text(70),
  metaKeywords: text(500),
  metaDescription: text(170),
  canonicalTag: z.string().trim().max(500).refine((v) => v === '' || /^https?:\/\//i.test(v), 'Canonical must be a full URL (https://…)'),
  ogTitle: text(200),
  ogImage: imagePathSchema,
  schemaMarkup: schemaMarkupSchema,
  status: z.enum(LOCATION_PAGE_STATUSES),
};

export const createLocationPageSchema = z
  .object({
    ...fields,
    navServiceId: fields.navServiceId.optional(),
    heroEyebrow: fields.heroEyebrow.default(''),
    highlight: fields.highlight.default(''),
    features: fields.features.default([]),
    heroImage: fields.heroImage.default(''),
    heroImageAlt: fields.heroImageAlt.default(''),
    highlightedHeading: fields.highlightedHeading.default(''),
    metaTitle: fields.metaTitle.default(''),
    metaKeywords: fields.metaKeywords.default(''),
    metaDescription: fields.metaDescription.default(''),
    canonicalTag: fields.canonicalTag.default(''),
    ogTitle: fields.ogTitle.default(''),
    ogImage: fields.ogImage.default(''),
    schemaMarkup: fields.schemaMarkup.default(''),
    status: fields.status.default('DRAFT'),
  })
  .strict()
  .refine((value) => value.pageType === 'HOME' || !!value.navServiceId, {
    message: 'Please select the service page',
    path: ['navServiceId'],
  });

// Partial update — e.g. only the status from the list, or images after upload.
export const updateLocationPageSchema = z
  .object(Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])) as {
    [K in keyof typeof fields]: z.ZodOptional<(typeof fields)[K]>;
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export type CreateLocationPageInput = z.infer<typeof createLocationPageSchema>;
export type UpdateLocationPageInput = z.infer<typeof updateLocationPageSchema>;
