import { z } from 'zod';
import { HELP_NOW_RATE_LIMITS, HELP_NOW_SERVICE_SLUGS } from '../bookings/helpNowPricing';

// Admin → Website Section → Help Now: the helpnow.citycalls.in home page
// sections. Each is one document, saved whole from its admin page.

export const HELP_NOW_HOME_SECTIONS = ['hero', 'marquee', 'about', 'services', 'faq', 'popular', 'steps', 'pricing'] as const;
export type HelpNowHomeSection = (typeof HELP_NOW_HOME_SECTIONS)[number];

export const SECTION_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
// Icons the marquee strip can show (lucide-react names on the website).
export const MARQUEE_ICONS = ['BookOpen', 'Clock', 'ShieldCheck', 'Star', 'Sparkles', 'BadgeCheck', 'Heart', 'Home', 'Zap', 'Users'] as const;
// Icons the "Simple Steps" timeline and the pricing perks can show.
export const STEP_ICONS = ['Home', 'CalendarDays', 'MapPin', 'CreditCard', 'CheckCircle2', 'ClipboardList', 'UserCheck', 'Sparkles', 'Clock', 'ShieldCheck'] as const;
export const PERK_ICONS = ['BadgeCheck', 'Wallet', 'BadgePercent', 'CalendarClock', 'ShieldCheck', 'Clock', 'Sparkles', 'Star'] as const;

export const HELP_NOW_HOME_LIMITS = { heroSlides: 6, marqueeItems: 12, aboutPoints: 10, aboutCards: 4, serviceCards: 6, faqItems: 20, steps: 6, pricingPerks: 4 } as const;

const imagePathSchema = z.string().trim().max(2048).refine(
  (value) => value === '' || value.startsWith('/uploads/') || value.startsWith('/assets/') || /^https?:\/\//i.test(value),
  'Image must be an uploaded path, a bundled asset path, or an http(s) URL'
);

const linkSchema = z.string().trim().max(500).refine(
  (value) => value === '' || value.startsWith('/') || value.startsWith('#') || /^https?:\/\//i.test(value),
  'Link must start with /, # or http(s)://'
);

const text = (max: number) => z.string().trim().max(max).default('');
const required = (max: number, label: string) => z.string().trim().min(1, `${label} is required`).max(max);
const status = z.enum(SECTION_STATUSES).default('ACTIVE');

export const heroSchema = z.object({
  slides: z.array(z.object({
    image: imagePathSchema.default(''),
    alt: text(200),
    badge: text(60),
    titleLine1: required(80, 'Title line 1'),
    titleLine2: text(80),
    description: text(300),
    primaryButtonText: text(40),
    primaryButtonLink: linkSchema.default(''),
    secondaryButtonText: text(40),
    secondaryButtonLink: linkSchema.default(''),
    active: z.boolean().default(true),
  }).strict()).min(1, 'Add at least one slide').max(HELP_NOW_HOME_LIMITS.heroSlides),
}).strict();

export const marqueeSchema = z.object({
  items: z.array(z.object({
    label: required(60, 'Text'),
    icon: z.enum(MARQUEE_ICONS).default('Sparkles'),
  }).strict()).min(1, 'Add at least one item').max(HELP_NOW_HOME_LIMITS.marqueeItems),
  status,
}).strict();

export const aboutSchema = z.object({
  eyebrow: text(60),
  // First heading line; `highlight` is the part of it shown in gold.
  heading: required(120, 'Heading'),
  highlight: text(60),
  headingLine2: text(120),
  description: text(700),
  points: z.array(z.string().trim().max(140)).max(HELP_NOW_HOME_LIMITS.aboutPoints)
    .transform((points) => points.filter(Boolean)),
  cards: z.array(z.object({
    title: required(80, 'Card title'),
    description: text(200),
    image: imagePathSchema.default(''),
    alt: text(200),
  }).strict()).max(HELP_NOW_HOME_LIMITS.aboutCards),
  status,
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

export const servicesSchema = z.object({
  cards: z.array(z.object({
    // Shown as up to three stacked lines, e.g. "KITCHEN" / "CLEANING" / "Sanitization".
    title: required(40, 'Title'),
    subtitle: text(40),
    subtitle2: text(40),
    description: text(200),
    image: imagePathSchema.default(''),
    alt: text(200),
  }).strict()).min(1, 'Add at least one card').max(HELP_NOW_HOME_LIMITS.serviceCards),
  status,
}).strict();

// Home page FAQ: headings + question cards (each with a preview image).
export const faqSchema = z.object({
  eyebrow: text(60),
  heading: required(120, 'Heading'),
  // Part of the heading shown in gold.
  highlight: text(60),
  description: text(300),
  items: z.array(z.object({
    question: required(200, 'Question'),
    answer: required(1000, 'Answer'),
    image: imagePathSchema.default(''),
    alt: text(200),
    active: z.boolean().default(true),
  }).strict()).max(HELP_NOW_HOME_LIMITS.faqItems),
  status,
}).strict().superRefine((value, ctx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
});

const highlightInHeading = (value: { heading: string; highlight: string }, ctx: z.RefinementCtx) => {
  if (value.highlight && !value.heading.includes(value.highlight)) {
    ctx.addIssue({ code: 'custom', path: ['highlight'], message: 'Highlight text must be part of the heading' });
  }
};

// "Our Popular Services": headings + one card per Help Now service. A card's
// ratePerHour is that service's real hourly rate — bookings are charged with
// it (bookings/helpNowRates.ts), so the card can never show a wrong price.
export const popularSchema = z.object({
  eyebrow: text(60),
  heading: required(120, 'Heading'),
  // Part of the heading shown in gold, with the underline.
  highlight: text(80),
  description: text(300),
  cards: z.array(z.object({
    slug: z.enum(HELP_NOW_SERVICE_SLUGS),
    ratePerHour: z.number().int('Price must be a whole number of rupees')
      .min(HELP_NOW_RATE_LIMITS.min, `Price must be at least ₹${HELP_NOW_RATE_LIMITS.min}/hr`)
      .max(HELP_NOW_RATE_LIMITS.max, `Price can be at most ₹${HELP_NOW_RATE_LIMITS.max}/hr`)
      .optional(),
    description: text(160),
    image: imagePathSchema.default(''),
    alt: text(200),
    // Small ribbon on the image, e.g. "Most Booked"; empty hides it.
    badge: text(24),
    active: z.boolean().default(true),
  }).strict()).min(1, 'Add at least one service').max(HELP_NOW_SERVICE_SLUGS.length),
  status,
}).strict().superRefine((value, ctx) => {
  highlightInHeading(value, ctx);
  const seen = new Set<string>();
  value.cards.forEach((card, i) => {
    if (seen.has(card.slug)) ctx.addIssue({ code: 'custom', path: ['cards', i, 'slug'], message: 'Each service can have only one card' });
    seen.add(card.slug);
  });
});

// "Simple Steps to Book": the numbered booking timeline.
export const stepsSchema = z.object({
  eyebrow: text(60),
  heading: required(120, 'Heading'),
  highlight: text(60),
  items: z.array(z.object({
    icon: z.enum(STEP_ICONS).default('CheckCircle2'),
    title: required(60, 'Step title'),
    description: text(200),
  }).strict()).min(2, 'Add at least two steps').max(HELP_NOW_HOME_LIMITS.steps),
  status,
}).strict().superRefine(highlightInHeading);

// "Fair Pricing": the price calculator's text. Rates, hours and coupons come
// from the booking backend, not from here.
export const pricingSchema = z.object({
  eyebrow: text(60),
  heading: required(120, 'Heading'),
  highlight: text(60),
  description: text(200),
  perks: z.array(z.object({
    icon: z.enum(PERK_ICONS).default('BadgeCheck'),
    title: required(40, 'Perk title'),
    text: text(60),
  }).strict()).max(HELP_NOW_HOME_LIMITS.pricingPerks),
  // Small line under the calculator.
  note: text(200),
  status,
}).strict().superRefine(highlightInHeading);

export const HELP_NOW_HOME_SCHEMAS = {
  hero: heroSchema,
  marquee: marqueeSchema,
  about: aboutSchema,
  services: servicesSchema,
  faq: faqSchema,
  popular: popularSchema,
  steps: stepsSchema,
  pricing: pricingSchema,
} as const;

export type HelpNowHomeContent = {
  hero: z.infer<typeof heroSchema>;
  marquee: z.infer<typeof marqueeSchema>;
  about: z.infer<typeof aboutSchema>;
  services: z.infer<typeof servicesSchema>;
  faq: z.infer<typeof faqSchema>;
  popular: z.infer<typeof popularSchema>;
  steps: z.infer<typeof stepsSchema>;
  pricing: z.infer<typeof pricingSchema>;
};

export const helpNowHomeSectionParamSchema = z.object({ section: z.enum(HELP_NOW_HOME_SECTIONS) }).strict();
