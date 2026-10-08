import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

// Admin → Website Section → Key Features: the "Why choose us — Six reasons
// CityCalls is Ghaziabad's default" cards on the home and About pages.

export const KEY_FEATURE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type KeyFeatureStatus = (typeof KEY_FEATURE_STATUSES)[number];

// Icons the website knows how to draw (lucide-react names).
export const KEY_FEATURE_ICONS = [
  'BadgeCheck', 'HandCoins', 'Timer', 'Home', 'Wrench', 'ShieldCheck', 'Clock', 'Star', 'ThumbsUp', 'Users',
  'Sparkles', 'Award', 'Headphones', 'Truck', 'IndianRupee', 'Zap', 'Heart', 'CheckCircle2', 'PhoneCall', 'Leaf',
] as const;
export type KeyFeatureIcon = (typeof KEY_FEATURE_ICONS)[number];

export const KEY_FEATURES_SECTION_KEY = 'home';

export interface KeyFeatureContent {
  title: string;
  description: string;
  icon: KeyFeatureIcon;
  sortOrder: number;
  status: KeyFeatureStatus;
}

export interface IKeyFeature extends Document, KeyFeatureContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const keyFeatureSchema = new Schema<IKeyFeature>(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 120, default: '' },
    icon: { type: String, enum: KEY_FEATURE_ICONS, default: 'BadgeCheck' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: KEY_FEATURE_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

keyFeatureSchema.index({ status: 1, sortOrder: 1 });

export const KeyFeatureModel = model<IKeyFeature>('CityCallsHomeKeyFeature', keyFeatureSchema, 'cityCallsHomeKeyFeatures');

// ─── Section heading (single document) ─────────────────────────────────────
export interface KeyFeaturesSectionContent {
  eyebrow: string;
  heading: string;
  // Part of the heading shown in green (on its own line on wide screens).
  highlight: string;
  description: string;
}

export interface IKeyFeaturesSection extends Document, KeyFeaturesSectionContent {
  key: string;
  // Set once the default cards have been created, so deleting them all in
  // admin doesn't bring them back.
  seeded: boolean;
  updatedBy?: ActorSnapshot;
}

const keyFeaturesSectionSchema = new Schema<IKeyFeaturesSection>(
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

export const KeyFeaturesSectionModel = model<IKeyFeaturesSection>(
  'CityCallsHomeKeyFeaturesSection',
  keyFeaturesSectionSchema,
  'cityCallsHomeKeyFeaturesSection'
);

// What the website showed before this was editable.
export const KEY_FEATURES_SECTION_DEFAULTS: KeyFeaturesSectionContent = {
  eyebrow: 'Why choose us',
  heading: "Six reasons CityCalls is Ghaziabad's default.",
  highlight: "Ghaziabad's default.",
  description: "We don't just fix appliances — we build trust and long-lasting partnerships through transparency, quality, and exceptional doorstep service.",
};

export const KEY_FEATURE_DEFAULTS: KeyFeatureContent[] = [
  { title: 'Verified technicians', description: 'Background-checked, trained, rated.', icon: 'BadgeCheck', sortOrder: 1, status: 'ACTIVE' },
  { title: 'Transparent pricing', description: 'Flat rates. No surprises at the end.', icon: 'HandCoins', sortOrder: 2, status: 'ACTIVE' },
  { title: 'On-time guarantee', description: 'We arrive within your slot or refund.', icon: 'Timer', sortOrder: 3, status: 'ACTIVE' },
  { title: 'Doorstep service', description: 'Zero commute. Zero waiting rooms.', icon: 'Home', sortOrder: 4, status: 'ACTIVE' },
  { title: 'Genuine spare parts', description: 'Only OEM-grade parts, ever.', icon: 'Wrench', sortOrder: 5, status: 'ACTIVE' },
  { title: '30-day warranty', description: 'Every job covered post-service.', icon: 'ShieldCheck', sortOrder: 6, status: 'ACTIVE' },
];
