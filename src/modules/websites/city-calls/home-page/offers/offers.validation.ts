import { z } from 'zod';
import { OFFER_ICONS, OFFER_STATUSES } from './offer.model';
import { OFFER_STRIP_STATUSES } from './offerStrip.model';

// Colours end up in inline `style` on the public site, so only plain colour
// syntax is accepted: hex, rgb()/hsl(), named colours and linear-gradient().
// url(), var() and anything else that could pull in outside content is refused.
const colorSchema = (max: number) => z.string().trim().max(max).refine(
  (value) => value === '' || (/^[#a-zA-Z0-9(),.%\s-]+$/.test(value) && !/\b(url|var|expression|image|element)\s*\(/i.test(value)),
  'Must be a colour (hex, rgb, hsl, named) or a linear-gradient(...)'
);

// Internal paths ("/services") or http(s) links only — never javascript: etc.
const linkSchema = z.string().trim().max(500).refine(
  (value) => value === '' || value.startsWith('/') || value.startsWith('#') || /^https?:\/\//i.test(value),
  'Link must start with /, # or http(s)://'
);

export const updateOfferStripSchema = z.object({
  textLeft: z.string().trim().max(120).optional(),
  discountText: z.string().trim().max(60).optional(),
  textRight: z.string().trim().max(160).optional(),
  couponCode: z.string().trim().max(40).optional(),
  buttonText: z.string().trim().max(40).optional(),
  buttonLink: linkSchema.optional(),
  bgGradientFrom: colorSchema(200).optional(),
  bgGradientVia: colorSchema(200).optional(),
  bgGradientTo: colorSchema(200).optional(),
  discountBg: colorSchema(100).optional(),
  discountTextColor: colorSchema(100).optional(),
  couponBg: colorSchema(100).optional(),
  couponTextColor: colorSchema(100).optional(),
  status: z.enum(OFFER_STRIP_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be supplied',
});

const offerFields = {
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
  couponCode: z.string().trim().max(40).optional(),
  icon: z.enum(OFFER_ICONS).default('Gift'),
  accentColor: colorSchema(100).default('#3e8914'),
  tintColor: colorSchema(100).default('#e8f5e9'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(OFFER_STATUSES).default('ACTIVE'),
};

export const createOfferSchema = z.object(offerFields).strict();

export const updateOfferSchema = z.object({
  title: offerFields.title.optional(),
  description: z.string().trim().max(240).optional(),
  couponCode: z.string().trim().max(40).optional(),
  icon: z.enum(OFFER_ICONS).optional(),
  accentColor: colorSchema(100).optional(),
  tintColor: colorSchema(100).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(OFFER_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be supplied',
});

export const listOffersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(OFFER_STATUSES).optional(),
}).strict();
