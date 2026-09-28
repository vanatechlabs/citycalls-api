import { z } from 'zod';
import { SEO_META_STATUSES } from './seoMeta.model';

// A site-relative path: "/", "/about", "/services/ac-service".
export const pagePathSchema = z.string().trim().toLowerCase().max(300).regex(
  /^\/[a-z0-9\-/]*$/,
  'Page path must start with / and use only letters, numbers, - and /'
);

const imageSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded file path or an http(s) URL'
);

const canonicalSchema = z.string().trim().max(500).refine(
  (value) => value === '' || /^https?:\/\/[^\s<>"']+$/i.test(value),
  'Canonical must be a full http(s) URL'
);

// Empty is fine; anything else must parse as JSON (object or array).
const jsonLdSchema = z.string().trim().max(20000).refine((value) => {
  if (!value) return true;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}, 'Schema markup must be valid JSON-LD (a JSON object or array)');

const seoFields = {
  metaTitle: z.string().trim().max(70).optional(),
  metaKeywords: z.string().trim().max(500).optional(),
  metaDescription: z.string().trim().max(170).optional(),
  openGraphTags: z.string().trim().max(5000).optional(),
  schemaMarkup: jsonLdSchema.optional(),
  canonicalUrl: canonicalSchema.optional(),
  ogImage: imageSchema.optional(),
  status: z.enum(SEO_META_STATUSES).optional(),
};

export const createSeoMetaSchema = z.object({ pagePath: pagePathSchema, ...seoFields }).strict();

// pagePath is fixed once created — edit the page's own entry instead.
export const updateSeoMetaSchema = z.object(seoFields).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be supplied',
});

export const listSeoMetaQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(SEO_META_STATUSES).optional(),
}).strict();

export const publicSeoMetaQuerySchema = z.object({ path: pagePathSchema }).strict();
