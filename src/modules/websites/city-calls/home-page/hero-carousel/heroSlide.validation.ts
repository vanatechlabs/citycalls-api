import { z } from 'zod';
import { HERO_SLIDE_STATUSES, MAX_HERO_OVERLAY_OPACITY } from './heroSlide.model';

const imagePathSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith('/uploads/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded file path or an http(s) URL'
);

// null resets the slide to the default overlay.
const overlayOpacitySchema = z.coerce.number().int().min(0).max(MAX_HERO_OVERLAY_OPACITY).nullable();

const heroSlideFields = {
  image: imagePathSchema.optional(),
  altText: z.string().trim().max(160).optional(),
  subtitle: z.string().trim().min(1).max(100),
  titleLine1: z.string().trim().min(1).max(120),
  titleLine2: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  sortOrder: z.coerce.number().int().min(0).default(0),
  overlayOpacity: overlayOpacitySchema.optional(),
  status: z.enum(HERO_SLIDE_STATUSES).default('ACTIVE'),
};

export const createHeroSlideSchema = z.object(heroSlideFields).strict();

export const updateHeroSlideSchema = z.object({
  image: imagePathSchema.optional(),
  altText: z.string().trim().max(160).optional(),
  subtitle: heroSlideFields.subtitle.optional(),
  titleLine1: heroSlideFields.titleLine1.optional(),
  titleLine2: heroSlideFields.titleLine2.optional(),
  description: heroSlideFields.description.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  overlayOpacity: overlayOpacitySchema.optional(),
  status: z.enum(HERO_SLIDE_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be supplied',
});

export const listHeroSlidesQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(HERO_SLIDE_STATUSES).optional(),
}).strict();
