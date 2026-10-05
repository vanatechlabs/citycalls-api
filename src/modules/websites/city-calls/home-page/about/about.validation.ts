import { z } from 'zod';
import { ABOUT_IMAGE_COUNT, ABOUT_STATUSES, MAX_ABOUT_POINTS } from './about.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const linkSchema = z.string().trim().max(500).refine(
  (value) => value === '' || value.startsWith('/') || value.startsWith('#') || /^https?:\/\//i.test(value),
  'Link must start with /, # or http(s)://'
);

const optionalText = (max: number) => z.string().trim().max(max).default('');

export const updateAboutSchema = z.object({
  eyebrow: optionalText(60),
  heading: z.string().trim().min(1, 'Heading is required').max(160),
  highlight: optionalText(80),
  description: optionalText(600),
  // Empty lines are dropped.
  points: z
    .array(z.string().trim().max(120))
    .max(MAX_ABOUT_POINTS)
    .transform((points) => points.filter(Boolean)),
  missionTitle: optionalText(60),
  missionText: optionalText(300),
  visionTitle: optionalText(60),
  visionText: optionalText(300),
  buttonText: optionalText(40),
  buttonLink: linkSchema.default(''),
  images: z
    .array(z.object({ image: imagePathSchema.default(''), alt: optionalText(200) }).strict())
    .length(ABOUT_IMAGE_COUNT, `Exactly ${ABOUT_IMAGE_COUNT} image slots are expected`),
  status: z.enum(ABOUT_STATUSES).default('ACTIVE'),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export type UpdateAboutInput = z.infer<typeof updateAboutSchema>;
