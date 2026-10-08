import { z } from 'zod';
import { FAQ_STATUSES } from './faq.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const faqFields = {
  question: z.string().trim().min(5, 'Question is required').max(200),
  answer: z.string().trim().min(5, 'Answer is required').max(1500),
  image: imagePathSchema,
  altText: z.string().trim().max(200),
  sortOrder: z.coerce.number().int().min(0),
  status: z.enum(FAQ_STATUSES),
};

export const createFaqSchema = z.object({
  ...faqFields,
  image: faqFields.image.default(''),
  altText: faqFields.altText.default(''),
  sortOrder: faqFields.sortOrder.default(0),
  status: faqFields.status.default('ACTIVE'),
}).strict();

// Partial update — e.g. just the image after upload, or the status.
export const updateFaqSchema = z.object({
  question: faqFields.question.optional(),
  answer: faqFields.answer.optional(),
  image: faqFields.image.optional(),
  altText: faqFields.altText.optional(),
  sortOrder: faqFields.sortOrder.optional(),
  status: faqFields.status.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export const updateFaqSectionSchema = z.object({
  subheading: z.string().trim().max(60).default(''),
  heading: z.string().trim().min(1, 'Main heading is required').max(120),
  highlightedWord: z.string().trim().max(60).default(''),
  description: z.string().trim().max(300).default(''),
}).strict().superRefine((value, ctx) => {
  if (value.highlightedWord && !value.heading.includes(value.highlightedWord)) {
    ctx.addIssue({ code: 'custom', path: ['highlightedWord'], message: 'Highlight word must be part of the main heading' });
  }
});

export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type UpdateFaqSectionInput = z.infer<typeof updateFaqSectionSchema>;
