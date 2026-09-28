import { z } from 'zod';
import { SERVICE_PAGE_STATUSES } from './servicePage.model';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const imagePathSchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === '' || value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
    'Image must be an uploaded file path or an http(s) URL'
  );

export const servicePageServiceIdParamSchema = z.object({ serviceId: objectIdSchema });

export const servicePageSlugParamSchema = z.object({
  slug: z.string().trim().toLowerCase().min(1).max(120).regex(/^[a-z0-9-]+$/),
});

export const upsertServicePageSchema = z
  .object({
    slug: z.string().trim().toLowerCase().min(1).max(120).regex(/^[a-z0-9-]+$/),
    heroImage: imagePathSchema.optional(),
    heroEyebrow: requiredText(120),
    heroTitle: requiredText(180),
    heroHighlight: requiredText(100),
    heroDescription: requiredText(700),
    heroFeatures: z.array(z.object({ title: requiredText(80), subtitle: requiredText(80) }).strict()).length(4),
    walkthroughEyebrow: requiredText(120),
    walkthroughTitle: requiredText(160),
    walkthroughHighlight: requiredText(100),
    walkthroughDescription: requiredText(700),
    steps: z.array(z.object({ badge: requiredText(30), title: requiredText(100), description: requiredText(500) }).strict()).length(4),
    statsTitle: requiredText(120),
    statsHighlight: requiredText(80),
    stats: z.array(z.object({ value: requiredText(30), label: requiredText(100) }).strict()).length(4),
    bannerEyebrow: requiredText(120),
    bannerTitle: requiredText(180),
    bannerHighlight: requiredText(100),
    bannerDescription: requiredText(700),
    bannerImage: imagePathSchema.optional(),
    areasTitle: requiredText(180),
    areasHighlight: requiredText(100),
    areasDescription: requiredText(700),
    areas: z.array(requiredText(100)).min(1).max(50),
    status: z.enum(SERVICE_PAGE_STATUSES).default('ACTIVE'),
  })
  .strict();
