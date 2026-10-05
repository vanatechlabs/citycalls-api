import { z } from 'zod';
import { PACKAGE_STATUSES } from './popularPackages.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const linkSchema = z.string().trim().max(500).refine(
  (value) => value === '' || value.startsWith('/') || value.startsWith('#') || /^https?:\/\//i.test(value),
  'Link must start with /, # or http(s)://'
);

const optionalText = (max: number) => z.string().trim().max(max).default('');

const packageFields = {
  name: z.string().trim().min(1, 'Package name is required').max(80),
  duration: optionalText(40),
  price: z.coerce.number().int('Price must be a whole number').min(0).max(1_000_000),
  image: imagePathSchema.default(''),
  imageAlt: optionalText(200),
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(PACKAGE_STATUSES).default('ACTIVE'),
};

export const createPackageSchema = z.object(packageFields).strict();

// Partial update (also how the image is attached after the package exists).
export const updatePackageSchema = z.object({
  name: packageFields.name.optional(),
  duration: z.string().trim().max(40).optional(),
  price: packageFields.price.optional(),
  image: imagePathSchema.optional(),
  imageAlt: z.string().trim().max(200).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(PACKAGE_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export const updatePackagesSectionSchema = z.object({
  eyebrow: optionalText(60),
  heading: z.string().trim().min(1, 'Heading is required').max(120),
  highlight: optionalText(80),
  description: optionalText(400),
  buttonText: optionalText(40),
  buttonLink: linkSchema.default(''),
  status: z.enum(PACKAGE_STATUSES).default('ACTIVE'),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type UpdatePackagesSectionInput = z.infer<typeof updatePackagesSectionSchema>;
