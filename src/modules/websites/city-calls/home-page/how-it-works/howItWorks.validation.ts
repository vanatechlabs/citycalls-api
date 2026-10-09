import { z } from 'zod';
import { HOW_IT_WORKS_ICONS, HOW_IT_WORKS_STATUSES } from './howItWorks.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const fields = {
  title: z.string().trim().min(2, 'Title is required').max(60),
  description: z.string().trim().max(200),
  image: imagePathSchema,
  imageAlt: z.string().trim().max(200),
  icon: z.enum(HOW_IT_WORKS_ICONS),
  sortOrder: z.coerce.number().int().min(0),
  status: z.enum(HOW_IT_WORKS_STATUSES),
};

export const createHowItWorksStepSchema = z.object({
  ...fields,
  description: fields.description.default(''),
  image: fields.image.default(''),
  imageAlt: fields.imageAlt.default(''),
  icon: fields.icon.default('CalendarCheck'),
  sortOrder: fields.sortOrder.default(0),
  status: fields.status.default('ACTIVE'),
}).strict();

// Partial update — e.g. just the image after upload, or the status.
export const updateHowItWorksStepSchema = z.object({
  title: fields.title.optional(),
  description: fields.description.optional(),
  image: fields.image.optional(),
  imageAlt: fields.imageAlt.optional(),
  icon: fields.icon.optional(),
  sortOrder: fields.sortOrder.optional(),
  status: fields.status.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export const updateHowItWorksSectionSchema = z.object({
  eyebrow: z.string().trim().max(60).default(''),
  heading: z.string().trim().min(1, 'Heading is required').max(140),
  highlight: z.string().trim().max(80).default(''),
  description: z.string().trim().max(400).default(''),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export type CreateHowItWorksStepInput = z.infer<typeof createHowItWorksStepSchema>;
export type UpdateHowItWorksStepInput = z.infer<typeof updateHowItWorksStepSchema>;
export type UpdateHowItWorksSectionInput = z.infer<typeof updateHowItWorksSectionSchema>;
