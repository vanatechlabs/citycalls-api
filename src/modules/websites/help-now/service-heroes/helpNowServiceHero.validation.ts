import { z } from 'zod';
import { HELP_NOW_SERVICE_SLUGS } from '../bookings/helpNowPricing';

// Admin → Website Section → Help Now → Service Page Hero: the banner at the
// top of each helpnow.citycalls.in/services/<slug> page.

export const SERVICE_HERO_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const MAX_SERVICE_HERO_FEATURES = 4;

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const text = (max: number) => z.string().trim().max(max).default('');

export const serviceHeroSlugParamSchema = z.object({ slug: z.enum(HELP_NOW_SERVICE_SLUGS) });

export const serviceHeroSchema = z.object({
  subheading: text(60),
  // The page's H1; `highlight` is the part of it shown in gold.
  heading: z.string().trim().min(1, 'Heading is required').max(120),
  highlight: text(80),
  description: text(300),
  features: z.array(z.object({
    title: z.string().trim().min(1, 'Every feature needs a title').max(30),
    subtitle: text(30),
  }).strict()).max(MAX_SERVICE_HERO_FEATURES).default([]),
  image: imagePathSchema.default(''),
  imageAlt: text(200),
  status: z.enum(SERVICE_HERO_STATUSES).default('ACTIVE'),
}).strict().refine((hero) => !hero.highlight || hero.heading.includes(hero.highlight), {
  message: 'Highlight text must be part of the heading',
  path: ['highlight'],
});

export type ServiceHeroContent = z.infer<typeof serviceHeroSchema>;
