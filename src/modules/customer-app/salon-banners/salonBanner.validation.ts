import { z } from 'zod';
import { SALON_BANNER_STATUSES } from './salonBanner.model';

const imagePathSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded file path or an http(s) URL'
);

const salonBannerFields = {
  tagLine: z.string().trim().min(1).max(60),
  titleLine1: z.string().trim().min(1).max(60),
  titleLine2: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(200),
  buttonText: z.string().trim().min(1).max(40),
  image: imagePathSchema.optional(),
  altText: z.string().trim().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(SALON_BANNER_STATUSES).default('ACTIVE'),
};

export const createSalonBannerSchema = z.object(salonBannerFields).strict();

export const updateSalonBannerSchema = z.object({
  tagLine: salonBannerFields.tagLine.optional(),
  titleLine1: salonBannerFields.titleLine1.optional(),
  titleLine2: salonBannerFields.titleLine2.optional(),
  description: salonBannerFields.description.optional(),
  buttonText: salonBannerFields.buttonText.optional(),
  image: imagePathSchema.optional(),
  altText: z.string().trim().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(SALON_BANNER_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be supplied',
});

export const listSalonBannersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(SALON_BANNER_STATUSES).optional(),
}).strict();
