import { z } from 'zod';
import { NAVBAR_STATUSES } from './navbarMenu.model';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

const imagePathSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
    'Image must be an uploaded file path or an http(s) URL'
  );

export const createNavbarMenuSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: slugSchema,
    sortOrder: z.coerce.number().int().min(0).default(0),
    status: z.enum(NAVBAR_STATUSES).default('ACTIVE'),
  })
  .strict();

export const updateNavbarMenuSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    slug: slugSchema.optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    status: z.enum(NAVBAR_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export const navbarMenuIdParamSchema = z.object({
  menuId: z.string().min(1),
});

export const createNavbarServiceSchema = z
  .object({
    menuId: z.string().min(1),
    name: z.string().trim().min(1).max(150),
    image: imagePathSchema.optional(),
    path: z.string().trim().min(1).max(300),
    sortOrder: z.coerce.number().int().min(0).default(0),
    status: z.enum(NAVBAR_STATUSES).default('ACTIVE'),
  })
  .strict();

export const updateNavbarServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    image: imagePathSchema.optional(),
    path: z.string().trim().min(1).max(300).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    status: z.enum(NAVBAR_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });
