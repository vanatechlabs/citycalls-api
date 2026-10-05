import { z } from 'zod';
import { OUR_SERVICE_STATUSES } from './ourServices.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const linkSchema = z.string().trim().max(500).refine(
  (value) => value === '' || value.startsWith('/') || value.startsWith('#') || /^https?:\/\//i.test(value),
  'Link must start with /, # or http(s)://'
);

const pagePathSchema = z.string().trim().min(1, 'Website path is required').max(300).refine(
  (value) => value.startsWith('/'),
  'Website path must start with /'
);

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid service');
const optionalText = (max: number) => z.string().trim().max(max).default('');

const cardFields = {
  navServiceId: objectIdSchema.optional(),
  name: z.string().trim().min(1, 'Service name is required').max(120),
  path: pagePathSchema,
  shortDescription: optionalText(200),
  image: imagePathSchema.default(''),
  imageAlt: optionalText(200),
  priceText: optionalText(60),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(OUR_SERVICE_STATUSES).default('ACTIVE'),
};

export const createOurServiceSchema = z.object(cardFields).strict();

// Partial update (also how the image is attached once the card exists).
export const updateOurServiceSchema = z.object({
  navServiceId: objectIdSchema.optional(),
  name: cardFields.name.optional(),
  path: pagePathSchema.optional(),
  shortDescription: z.string().trim().max(200).optional(),
  image: imagePathSchema.optional(),
  imageAlt: z.string().trim().max(200).optional(),
  priceText: z.string().trim().max(60).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(OUR_SERVICE_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export const updateOurServicesSectionSchema = z.object({
  eyebrow: optionalText(60),
  heading: z.string().trim().min(1, 'Heading is required').max(160),
  highlight: optionalText(80),
  description: optionalText(400),
  buttonText: optionalText(40),
  buttonLink: linkSchema.default(''),
  status: z.enum(OUR_SERVICE_STATUSES).default('ACTIVE'),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export type CreateOurServiceInput = z.infer<typeof createOurServiceSchema>;
export type UpdateOurServiceInput = z.infer<typeof updateOurServiceSchema>;
export type UpdateOurServicesSectionInput = z.infer<typeof updateOurServicesSectionSchema>;
