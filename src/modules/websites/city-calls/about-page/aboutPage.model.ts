import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

// Admin → Website Section → About Page: every section of the website's
// /about page. The single-block sections (hero, story, parallax image, and
// the headings above the values and the journey) live in one document; the
// value cards and journey milestones are their own lists.

export const ABOUT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type AboutStatus = (typeof ABOUT_STATUSES)[number];

// Icons the website knows how to draw (lucide-react names).
export const ABOUT_VALUE_ICONS = [
  'ShieldCheck', 'Heart', 'Users', 'Award', 'Star', 'ThumbsUp', 'BadgeCheck', 'Sparkles', 'Clock', 'Wrench', 'HandCoins', 'Target',
] as const;
export const ABOUT_MILESTONE_ICONS = [
  'Flag', 'Users', 'Building2', 'Trophy', 'Rocket', 'Star', 'MapPin', 'Award', 'Sparkles', 'Target', 'TrendingUp', 'Heart',
] as const;
export type AboutValueIcon = (typeof ABOUT_VALUE_ICONS)[number];
export type AboutMilestoneIcon = (typeof ABOUT_MILESTONE_ICONS)[number];

export const MAX_HERO_POINTS = 6;
export const MAX_STORY_IMAGES = 4;
export const ABOUT_PAGE_KEY = 'about';

// ─── Single-block sections ──────────────────────────────────────────────────
export interface AboutHeroContent {
  // Two heading lines ("Building Trust," / "One Service at a Time").
  headingLine1: string;
  headingLine2: string;
  // Word(s) in either line shown in green.
  highlight: string;
  description: string;
  points: string[];
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  image: string;
  imageAlt: string;
}

export interface AboutImage {
  image: string;
  imageAlt: string;
}

export interface AboutStoryContent {
  eyebrow: string;
  heading: string;
  highlight: string;
  paragraphOne: string;
  paragraphTwo: string;
  missionTitle: string;
  missionText: string;
  teamTitle: string;
  teamText: string;
  images: AboutImage[];
}

export interface AboutParallaxContent {
  image: string;
  imageAlt: string;
  status: AboutStatus;
}

// Heading above a list (values, journey).
export interface AboutListHeading {
  eyebrow: string;
  heading: string;
}

type WithActor<T> = T & { updatedBy?: ActorSnapshot; updatedAt?: Date };

export interface IAboutPage extends Document {
  key: string;
  hero: WithActor<AboutHeroContent>;
  story: WithActor<AboutStoryContent>;
  parallax: WithActor<AboutParallaxContent>;
  valuesSection: WithActor<AboutListHeading>;
  journeySection: WithActor<AboutListHeading>;
  // Set once the default cards / milestones have been created, so deleting
  // them all in admin doesn't bring them back.
  valuesSeeded: boolean;
  journeySeeded: boolean;
}

const str = (maxlength: number) => ({ type: String, trim: true, maxlength, default: '' });
const actorFields = { updatedBy: { type: actorSnapshotSchema }, updatedAt: { type: Date } };

const heroSchema = new Schema(
  {
    headingLine1: str(80),
    headingLine2: str(80),
    highlight: str(40),
    description: str(600),
    points: { type: [String], default: [] },
    primaryButtonText: str(40),
    primaryButtonLink: str(300),
    secondaryButtonText: str(40),
    secondaryButtonLink: str(300),
    image: str(2048),
    imageAlt: str(200),
    ...actorFields,
  },
  { _id: false }
);

const imageSchema = new Schema({ image: str(2048), imageAlt: str(200) }, { _id: false });

const storySchema = new Schema(
  {
    eyebrow: str(60),
    heading: str(140),
    highlight: str(80),
    paragraphOne: str(1000),
    paragraphTwo: str(1000),
    missionTitle: str(40),
    missionText: str(300),
    teamTitle: str(40),
    teamText: str(300),
    images: { type: [imageSchema], default: [] },
    ...actorFields,
  },
  { _id: false }
);

const parallaxSchema = new Schema(
  { image: str(2048), imageAlt: str(200), status: { type: String, enum: ABOUT_STATUSES, default: 'ACTIVE' }, ...actorFields },
  { _id: false }
);

const listHeadingSchema = new Schema({ eyebrow: str(60), heading: str(140), ...actorFields }, { _id: false });

const aboutPageSchema = new Schema<IAboutPage>(
  {
    key: { type: String, required: true, unique: true },
    hero: { type: heroSchema },
    story: { type: storySchema },
    parallax: { type: parallaxSchema },
    valuesSection: { type: listHeadingSchema },
    journeySection: { type: listHeadingSchema },
    valuesSeeded: { type: Boolean, default: false },
    journeySeeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AboutPageModel = model<IAboutPage>('CityCallsAboutPage', aboutPageSchema, 'cityCallsAboutPage');

// ─── Value cards ("What we stand for") ─────────────────────────────────────
export interface AboutValueContent {
  title: string;
  description: string;
  icon: AboutValueIcon;
  sortOrder: number;
  status: AboutStatus;
}

export interface IAboutValue extends Document, AboutValueContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
}

const aboutValueSchema = new Schema<IAboutValue>(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    description: str(200),
    icon: { type: String, enum: ABOUT_VALUE_ICONS, default: 'ShieldCheck' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ABOUT_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);
aboutValueSchema.index({ status: 1, sortOrder: 1 });

export const AboutValueModel = model<IAboutValue>('CityCallsAboutValue', aboutValueSchema, 'cityCallsAboutValues');

// ─── Journey milestones ("Our Journey") ────────────────────────────────────
export interface AboutMilestoneContent {
  year: string;
  title: string;
  description: string;
  // Small label on the photo, e.g. "Milestone 01" or "Future Vision".
  tag: string;
  icon: AboutMilestoneIcon;
  image: string;
  imageAlt: string;
  sortOrder: number;
  status: AboutStatus;
}

export interface IAboutMilestone extends Document, AboutMilestoneContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
}

const aboutMilestoneSchema = new Schema<IAboutMilestone>(
  {
    year: { type: String, required: true, trim: true, maxlength: 12 },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: str(300),
    tag: str(40),
    icon: { type: String, enum: ABOUT_MILESTONE_ICONS, default: 'Flag' },
    image: str(2048),
    imageAlt: str(200),
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ABOUT_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);
aboutMilestoneSchema.index({ status: 1, sortOrder: 1 });

export const AboutMilestoneModel = model<IAboutMilestone>('CityCallsAboutMilestone', aboutMilestoneSchema, 'cityCallsAboutMilestones');

// ─── What the website showed before this was editable ──────────────────────
export const ABOUT_HERO_DEFAULTS: AboutHeroContent = {
  headingLine1: 'Building Trust,',
  headingLine2: 'One Service at a Time',
  highlight: 'Service',
  description:
    'CityCalls is your trusted partner for all home services in Ghaziabad. We connect you with verified, skilled and background-checked professionals who deliver quality work with honesty and transparency.',
  points: ['Verified & Experienced Professionals', 'On-Time at your Doorstep', 'Transparent Pricing', 'Dedicated Customer Support'],
  primaryButtonText: 'Explore Services',
  primaryButtonLink: '/',
  secondaryButtonText: 'Contact Us',
  secondaryButtonLink: '/contact',
  image: '/assets/Banner/about.png',
  imageAlt: 'Smiling CityCalls technician in a green uniform — trusted by 10,000+ happy customers',
};

export const ABOUT_STORY_DEFAULTS: AboutStoryContent = {
  eyebrow: 'Our Story',
  heading: 'Rebuilding trust in home services',
  highlight: 'home services',
  paragraphOne:
    'CityCalls was born in a 1BHK in Vaishali after our founder had a fridge go down for the third time in a month. The local repair guys kept making it worse. The big-brand app never showed up. Something had to change.',
  paragraphTwo:
    'We believe home services can be world-class without the world-class price tag, if you focus obsessively on the basics: verified people, honest pricing, and showing up on time.',
  missionTitle: 'Our Mission',
  missionText: 'Make every service call feel like calling a friend who happens to be an expert.',
  teamTitle: 'Our Team',
  teamText: "We're a team of 40+ people in Ghaziabad — customer support, technicians, trainers, engineers.",
  images: [
    { image: '/assets/Services/s1.png', imageAlt: 'CityCalls technician repairing a refrigerator at a customer\'s home' },
    { image: '/assets/Services/s2.png', imageAlt: 'CityCalls technician servicing a wall-mounted split AC' },
    { image: '/assets/Services/s3.png', imageAlt: 'CityCalls technician repairing a front-load washing machine' },
    { image: '/assets/Services/s4.png', imageAlt: 'CityCalls technician fixing the circuit board of an LED TV' },
  ],
};

export const ABOUT_PARALLAX_DEFAULTS: AboutParallaxContent = {
  image: '/assets/Banner/cara2.png',
  imageAlt: 'CityCalls pest control expert spraying treatment along a living room wall',
  status: 'ACTIVE',
};

export const ABOUT_VALUES_SECTION_DEFAULTS: AboutListHeading = {
  eyebrow: 'What we stand for',
  heading: 'Four values, non-negotiable.',
};

export const ABOUT_JOURNEY_SECTION_DEFAULTS: AboutListHeading = {
  eyebrow: 'Our Story & Growth',
  heading: 'Our Journey',
};

export const ABOUT_VALUE_DEFAULTS: AboutValueContent[] = [
  { title: 'Trust first', description: 'Every pro is verified before their first job — and re-verified every year.', icon: 'ShieldCheck', sortOrder: 1, status: 'ACTIVE' },
  { title: 'Customer-obsessed', description: 'We track every rating, every complaint, every callback. And we act.', icon: 'Heart', sortOrder: 2, status: 'ACTIVE' },
  { title: 'Fair to our pros', description: 'We take a smaller cut than any competitor, so our pros earn more per job.', icon: 'Users', sortOrder: 3, status: 'ACTIVE' },
  { title: 'Quality without compromise', description: "We'd rather turn down a job than send an untrained person to your home.", icon: 'Award', sortOrder: 4, status: 'ACTIVE' },
];

export const ABOUT_MILESTONE_DEFAULTS: AboutMilestoneContent[] = [
  {
    year: '2022', title: 'The Beginning', tag: 'Milestone 01', icon: 'Flag', sortOrder: 1, status: 'ACTIVE',
    description: 'Started CityCalls with a mission to simplify home services across all households.',
    image: '/assets/Services/s1.png', imageAlt: 'CityCalls technician repairing a refrigerator — where our journey began',
  },
  {
    year: '2023', title: 'Growing Community', tag: 'Milestone 02', icon: 'Users', sortOrder: 2, status: 'ACTIVE',
    description: 'Reached 1,000+ happy customers and rapidly expanded our service categories.',
    image: '/assets/Services/s2.png', imageAlt: 'CityCalls technician servicing a split AC for a growing customer base',
  },
  {
    year: '2024', title: 'Wider Reach', tag: 'Milestone 03', icon: 'Building2', sortOrder: 3, status: 'ACTIVE',
    description: 'Onboarded top-rated verified professionals serving thousands of doorstep requests.',
    image: '/assets/Services/s3.png', imageAlt: 'Verified CityCalls professional repairing a washing machine at the doorstep',
  },
  {
    year: '2025', title: 'Trusted by Many', tag: 'Milestone 04', icon: 'Trophy', sortOrder: 4, status: 'ACTIVE',
    description: 'Crossed 10,000+ completed orders with glowing 5-star customer reviews.',
    image: '/assets/Services/s4.png', imageAlt: 'CityCalls technician repairing an LED TV for a 5-star rated service',
  },
  {
    year: '2026', title: 'Scaling Nationwide', tag: 'Milestone 05', icon: 'Rocket', sortOrder: 5, status: 'ACTIVE',
    description: 'Expanding into major new cities with automated booking and instant dispatch.',
    image: '/assets/Services/s5.png', imageAlt: 'CityCalls technician repairing a built-in microwave oven',
  },
  {
    year: '2027', title: 'The Road Ahead', tag: 'Future Vision', icon: 'Star', sortOrder: 6, status: 'ACTIVE',
    description: 'Redefining home maintenance with AI scheduling and unmatched reliability.',
    image: '/assets/Services/s6.png', imageAlt: 'CityCalls technician servicing a bathroom geyser',
  },
];
