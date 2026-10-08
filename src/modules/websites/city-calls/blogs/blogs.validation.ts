import { z } from 'zod';
import { BLOG_STATUSES } from './blogs.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const optionalText = (max: number) => z.string().trim().max(max);

// "My Blog Post" → "my-blog-post" (lowercase letters, digits, single dashes).
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'URL slug is required')
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'URL slug can only use lowercase letters, numbers and dashes (e.g. ac-service-tips)');

// JSON-LD pasted with or without its <script> tag; stored as plain JSON.
const schemaMarkupSchema = z
  .string()
  .max(20_000)
  .transform((value) => value.replace(/<script[^>]*>/gi, '').replace(/<\/script>/gi, '').trim())
  .refine((value) => {
    if (!value) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, 'Schema markup must be valid JSON-LD');

const fields = {
  title: z.string().trim().min(3, 'Blog title is required').max(200),
  h1Title: optionalText(200),
  slug: slugSchema,
  excerpt: z.string().trim().min(10, 'Short summary is required').max(500),
  content: z.string().min(1, 'Blog content is required').max(200_000),
  author: optionalText(80),
  category: z.string().trim().min(2, 'Blog category is required').max(80),
  metaKeywords: optionalText(500),
  image: imagePathSchema,
  imageAlt: optionalText(200),
  status: z.enum(BLOG_STATUSES),
  featured: z.boolean(),
  metaTitle: optionalText(70),
  metaDescription: optionalText(170),
  canonicalTag: z.string().trim().max(500).refine((v) => v === '' || /^https?:\/\//i.test(v), 'Canonical must be a full URL (https://…)'),
  ogTitle: optionalText(200),
  ogImage: imagePathSchema,
  openGraphTags: z.string().max(5000),
  schemaMarkup: schemaMarkupSchema,
};

// Optional fields default to empty so the form can send only what it has.
export const createBlogSchema = z.object({
  ...fields,
  h1Title: fields.h1Title.default(''),
  author: fields.author.default('CityCalls Team'),
  metaKeywords: fields.metaKeywords.default(''),
  image: fields.image.default(''),
  imageAlt: fields.imageAlt.default(''),
  status: fields.status.default('DRAFT'),
  featured: fields.featured.default(false),
  metaTitle: fields.metaTitle.default(''),
  metaDescription: fields.metaDescription.default(''),
  canonicalTag: fields.canonicalTag.default(''),
  ogTitle: fields.ogTitle.default(''),
  ogImage: fields.ogImage.default(''),
  openGraphTags: fields.openGraphTags.default(''),
  schemaMarkup: fields.schemaMarkup.default(''),
}).strict();

// Partial update — e.g. only the status from the list, or the image after upload.
export const updateBlogSchema = z
  .object(Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()])) as {
    [K in keyof typeof fields]: z.ZodOptional<(typeof fields)[K]>;
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
