import { z } from 'zod';
import { ABOUT_MILESTONE_ICONS, ABOUT_STATUSES, ABOUT_VALUE_ICONS, MAX_HERO_POINTS, MAX_STORY_IMAGES } from './aboutPage.model';

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

// Site path ("/contact", "/#services") or a full http(s) URL.
const linkSchema = z.string().trim().max(300).refine(
  (value) => value === '' || value.startsWith('/') || /^https?:\/\//i.test(value),
  'Link must start with / or http(s)://'
);

const status = z.enum(ABOUT_STATUSES);
const sortOrder = z.coerce.number().int().min(0);

// ─── Hero ──────────────────────────────────────────────────────────────────
export const updateAboutHeroSchema = z.object({
  headingLine1: z.string().trim().min(1, 'Heading line 1 is required').max(80),
  headingLine2: z.string().trim().max(80).default(''),
  highlight: z.string().trim().max(40).default(''),
  description: z.string().trim().max(600).default(''),
  points: z.array(z.string().trim().min(1, 'A point cannot be empty').max(80)).max(MAX_HERO_POINTS).default([]),
  primaryButtonText: z.string().trim().max(40).default(''),
  primaryButtonLink: linkSchema.default(''),
  secondaryButtonText: z.string().trim().max(40).default(''),
  secondaryButtonLink: linkSchema.default(''),
  image: imagePathSchema.default(''),
  imageAlt: z.string().trim().max(200).default(''),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.headingLine1.includes(value.highlight) && !value.headingLine2.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

// ─── Our Story ─────────────────────────────────────────────────────────────
export const updateAboutStorySchema = z.object({
  eyebrow: z.string().trim().max(60).default(''),
  heading: z.string().trim().min(1, 'Heading is required').max(140),
  highlight: z.string().trim().max(80).default(''),
  paragraphOne: z.string().trim().min(1, 'First paragraph is required').max(1000),
  paragraphTwo: z.string().trim().max(1000).default(''),
  missionTitle: z.string().trim().max(40).default(''),
  missionText: z.string().trim().max(300).default(''),
  teamTitle: z.string().trim().max(40).default(''),
  teamText: z.string().trim().max(300).default(''),
  images: z.array(z.object({ image: imagePathSchema, imageAlt: z.string().trim().max(200).default('') }).strict())
    .max(MAX_STORY_IMAGES)
    .default([]),
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

// ─── Parallax image ────────────────────────────────────────────────────────
export const updateAboutParallaxSchema = z.object({
  image: imagePathSchema,
  imageAlt: z.string().trim().max(200).default(''),
  status: status.default('ACTIVE'),
}).strict();

// ─── Heading above the values / the journey ────────────────────────────────
export const updateAboutListHeadingSchema = z.object({
  eyebrow: z.string().trim().max(60).default(''),
  heading: z.string().trim().min(1, 'Heading is required').max(140),
}).strict();

// ─── Value cards ───────────────────────────────────────────────────────────
const valueFields = {
  title: z.string().trim().min(2, 'Title is required').max(60),
  description: z.string().trim().max(200),
  icon: z.enum(ABOUT_VALUE_ICONS),
  sortOrder,
  status,
};

export const createAboutValueSchema = z.object({
  ...valueFields,
  description: valueFields.description.default(''),
  icon: valueFields.icon.default('ShieldCheck'),
  sortOrder: valueFields.sortOrder.default(0),
  status: valueFields.status.default('ACTIVE'),
}).strict();

export const updateAboutValueSchema = z.object({
  title: valueFields.title.optional(),
  description: valueFields.description.optional(),
  icon: valueFields.icon.optional(),
  sortOrder: valueFields.sortOrder.optional(),
  status: valueFields.status.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

// ─── Journey milestones ────────────────────────────────────────────────────
const milestoneFields = {
  year: z.string().trim().min(2, 'Year is required').max(12),
  title: z.string().trim().min(2, 'Title is required').max(80),
  description: z.string().trim().max(300),
  tag: z.string().trim().max(40),
  icon: z.enum(ABOUT_MILESTONE_ICONS),
  image: imagePathSchema,
  imageAlt: z.string().trim().max(200),
  sortOrder,
  status,
};

export const createAboutMilestoneSchema = z.object({
  ...milestoneFields,
  description: milestoneFields.description.default(''),
  tag: milestoneFields.tag.default(''),
  icon: milestoneFields.icon.default('Flag'),
  image: milestoneFields.image.default(''),
  imageAlt: milestoneFields.imageAlt.default(''),
  sortOrder: milestoneFields.sortOrder.default(0),
  status: milestoneFields.status.default('ACTIVE'),
}).strict();

// Partial update — e.g. just the image after upload, or the status.
export const updateAboutMilestoneSchema = z.object({
  year: milestoneFields.year.optional(),
  title: milestoneFields.title.optional(),
  description: milestoneFields.description.optional(),
  tag: milestoneFields.tag.optional(),
  icon: milestoneFields.icon.optional(),
  image: milestoneFields.image.optional(),
  imageAlt: milestoneFields.imageAlt.optional(),
  sortOrder: milestoneFields.sortOrder.optional(),
  status: milestoneFields.status.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: 'At least one field must be supplied' });

export type UpdateAboutHeroInput = z.infer<typeof updateAboutHeroSchema>;
export type UpdateAboutStoryInput = z.infer<typeof updateAboutStorySchema>;
export type UpdateAboutParallaxInput = z.infer<typeof updateAboutParallaxSchema>;
export type UpdateAboutListHeadingInput = z.infer<typeof updateAboutListHeadingSchema>;
export type CreateAboutValueInput = z.infer<typeof createAboutValueSchema>;
export type UpdateAboutValueInput = z.infer<typeof updateAboutValueSchema>;
export type CreateAboutMilestoneInput = z.infer<typeof createAboutMilestoneSchema>;
export type UpdateAboutMilestoneInput = z.infer<typeof updateAboutMilestoneSchema>;
