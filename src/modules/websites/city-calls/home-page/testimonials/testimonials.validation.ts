import { z } from 'zod';
import { TESTIMONIAL_STATUSES } from './testimonials.model';

const optionalText = (max: number) => z.string().trim().max(max).default('');
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Colour must be a hex value like #3e8914');

const testimonialFields = {
  name: z.string().trim().min(2, 'Reviewer name is required').max(80),
  role: optionalText(120),
  location: optionalText(80),
  rating: z.coerce.number().int().min(1, 'Rating must be 1 to 5').max(5, 'Rating must be 1 to 5'),
  message: z.string().trim().min(5, 'Review text is required').max(1000),
  color: hexColor.default('#3e8914'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(TESTIMONIAL_STATUSES).default('PUBLISHED'),
};

export const createTestimonialSchema = z.object(testimonialFields).strict();

// Partial update — e.g. only the status from the table dropdown.
export const updateTestimonialSchema = z.object({
  name: testimonialFields.name.optional(),
  role: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  rating: testimonialFields.rating.optional(),
  message: testimonialFields.message.optional(),
  color: hexColor.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(TESTIMONIAL_STATUSES).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export const updateTestimonialsSectionSchema = z.object({
  eyebrow: optionalText(60),
  heading: z.string().trim().min(1, 'Heading is required').max(120),
  highlight: optionalText(80),
  minRating: z.coerce.number().int().min(1).max(5).default(1),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
export type UpdateTestimonialsSectionInput = z.infer<typeof updateTestimonialsSectionSchema>;
