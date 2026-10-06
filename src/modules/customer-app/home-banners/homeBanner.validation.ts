import { z } from 'zod';
import { HOME_BANNER_STATUSES } from './homeBanner.model';

const imagePathSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded file path or an http(s) URL'
);

const homeBannerFields = {
  tagLine: z.string().trim().min(1).max(60),
  titleLine1: z.string().trim().min(1).max(60),
  titleLine2: z.string().trim().min(1).max(60),
  description: z.string().trim().min(1).max(200),
  buttonText: z.string().trim().min(1).max(40),
  image: imagePathSchema.optional(),
  altText: z.string().trim().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(HOME_BANNER_STATUSES).default('ACTIVE'),
};

export const createHomeBannerSchema = z.object(homeBannerFields).strict();

export const updateHomeBannerSchema = z.object({
  tagLine: homeBannerFields.tagLine.optional(),
  titleLine1: homeBannerFields.titleLine1.optional(),
  titleLine2: homeBannerFields.titleLine2.optional(),
  description: homeBannerFields.description.optional(),
  buttonText: homeBannerFields.buttonText.optional(),
  image: imagePathSchema.optional(),
  altText: z.string().trim().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(HOME_BANNER_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be supplied',
});

export const listHomeBannersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(HOME_BANNER_STATUSES).optional(),
}).strict();
