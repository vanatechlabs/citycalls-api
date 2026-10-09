import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

// Admin → Website Section → How It Works: the home page's horizontal scroll
// story ("Book a Service → Expert Assigned → Doorstep Repair → Relax & Enjoy").

export const HOW_IT_WORKS_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type HowItWorksStatus = (typeof HOW_IT_WORKS_STATUSES)[number];

// Icons the website knows how to draw (lucide-react names).
export const HOW_IT_WORKS_ICONS = [
  'CalendarCheck', 'UserCheck', 'Wrench', 'ThumbsUp', 'PhoneCall', 'ClipboardCheck',
  'Truck', 'ShieldCheck', 'BadgeCheck', 'Home', 'Clock', 'Sparkles',
] as const;
export type HowItWorksIcon = (typeof HOW_IT_WORKS_ICONS)[number];

export const HOW_IT_WORKS_SECTION_KEY = 'home';

export interface HowItWorksStepContent {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: HowItWorksIcon;
  sortOrder: number;
  status: HowItWorksStatus;
}

export interface IHowItWorksStep extends Document, HowItWorksStepContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const howItWorksStepSchema = new Schema<IHowItWorksStep>(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAlt: { type: String, trim: true, maxlength: 200, default: '' },
    icon: { type: String, enum: HOW_IT_WORKS_ICONS, default: 'CalendarCheck' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: HOW_IT_WORKS_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

howItWorksStepSchema.index({ status: 1, sortOrder: 1 });

export const HowItWorksStepModel = model<IHowItWorksStep>('CityCallsHomeHowItWorksStep', howItWorksStepSchema, 'cityCallsHomeHowItWorksSteps');

// ─── Section heading (single document) ─────────────────────────────────────
export interface HowItWorksSectionContent {
  eyebrow: string;
  heading: string;
  // Part of the heading shown in green with an underline swoosh.
  highlight: string;
  description: string;
}

export interface IHowItWorksSection extends Document, HowItWorksSectionContent {
  key: string;
  // Set once the default steps have been created, so deleting them all in
  // admin doesn't bring them back.
  seeded: boolean;
  updatedBy?: ActorSnapshot;
}

const howItWorksSectionSchema = new Schema<IHowItWorksSection>(
  {
    key: { type: String, required: true, unique: true },
    eyebrow: { type: String, trim: true, maxlength: 60, default: '' },
    heading: { type: String, required: true, trim: true, maxlength: 140 },
    highlight: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    seeded: { type: Boolean, default: false },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const HowItWorksSectionModel = model<IHowItWorksSection>(
  'CityCallsHomeHowItWorksSection',
  howItWorksSectionSchema,
  'cityCallsHomeHowItWorksSection'
);

// What the website showed before this was editable.
export const HOW_IT_WORKS_SECTION_DEFAULTS: HowItWorksSectionContent = {
  eyebrow: 'Interactive Walkthrough',
  heading: 'How It Works',
  highlight: 'Works',
  description: 'Your appliance repair is just a few clicks away. We make it simple, transparent, and absolutely hassle-free.',
};

export const HOW_IT_WORKS_STEP_DEFAULTS: HowItWorksStepContent[] = [
  {
    title: 'Book a Service',
    description: 'Select your preferred date & time, and instantly book our service online.',
    image: '/assets/how-it-works/step-1-book.webp', imageAlt: 'Customer booking a CityCalls service on a phone',
    icon: 'CalendarCheck', sortOrder: 1, status: 'ACTIVE',
  },
  {
    title: 'Expert Assigned',
    description: 'A background-verified and highly trained technician is assigned to your booking.',
    image: '/assets/how-it-works/step-2-expert.webp', imageAlt: 'Verified CityCalls technician assigned to the booking',
    icon: 'UserCheck', sortOrder: 2, status: 'ACTIVE',
  },
  {
    title: 'Doorstep Repair',
    description: 'Our expert visits your home, diagnoses the issue, and fixes it using genuine parts.',
    image: '/assets/how-it-works/step-3-repair.webp', imageAlt: 'Technician repairing an appliance at the customer\'s home',
    icon: 'Wrench', sortOrder: 3, status: 'ACTIVE',
  },
  {
    title: 'Relax & Enjoy',
    description: 'Experience a hassle-free repair with our 30-day post-service warranty.',
    image: '/assets/how-it-works/step-4-relax.webp', imageAlt: 'Happy customer relaxing after the repair',
    icon: 'ThumbsUp', sortOrder: 4, status: 'ACTIVE',
  },
];
