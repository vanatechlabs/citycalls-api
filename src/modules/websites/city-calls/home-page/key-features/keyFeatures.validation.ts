import { z } from 'zod';
import { KEY_FEATURE_ICONS, KEY_FEATURE_STATUSES } from './keyFeatures.model';

const fields = {
  title: z.string().trim().min(2, 'Title is required').max(60),
  description: z.string().trim().max(120),
  icon: z.enum(KEY_FEATURE_ICONS),
  sortOrder: z.coerce.number().int().min(0),
  status: z.enum(KEY_FEATURE_STATUSES),
};

export const createKeyFeatureSchema = z.object({
  ...fields,
  description: fields.description.default(''),
  icon: fields.icon.default('BadgeCheck'),
  sortOrder: fields.sortOrder.default(0),
  status: fields.status.default('ACTIVE'),
}).strict();

// Partial update — e.g. just the status or the order.
export const updateKeyFeatureSchema = z.object({
  title: fields.title.optional(),
  description: fields.description.optional(),
  icon: fields.icon.optional(),
  sortOrder: fields.sortOrder.optional(),
  status: fields.status.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export const updateKeyFeaturesSectionSchema = z.object({
  eyebrow: z.string().trim().max(60).default(''),
  heading: z.string().trim().min(1, 'Heading is required').max(140),
  highlight: z.string().trim().max(80).default(''),
  description: z.string().trim().max(400).default(''),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export type CreateKeyFeatureInput = z.infer<typeof createKeyFeatureSchema>;
export type UpdateKeyFeatureInput = z.infer<typeof updateKeyFeatureSchema>;
export type UpdateKeyFeaturesSectionInput = z.infer<typeof updateKeyFeaturesSectionSchema>;
