import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

export const FEATURES_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type FeaturesStatus = (typeof FEATURES_STATUSES)[number];

// Icons the website knows how to draw for a feature card (lucide names).
export const FEATURE_ICONS = [
  'wrench', 'zap', 'sparkles', 'shield-check', 'droplets', 'wind', 'bug', 'paint-roller', 'house', 'settings',
] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

export const FEATURES_KEY = 'home';
export const MAX_FEATURE_ITEMS = 6;

export interface FeatureItem {
  icon: FeatureIcon;
  title: string;
  description: string;
}

export interface FeaturesContent {
  // One heading line per "\n".
  heading: string;
  // Part of the heading shown in the brand green.
  highlight: string;
  description: string;
  image: string;
  imageAlt: string;
  // Small label over the popup image, e.g. "Top Rated".
  imageBadge: string;
  items: FeatureItem[];
  status: FeaturesStatus;
}

export interface IFeatures extends Document, FeaturesContent {
  key: string;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

// Mirrors what nextfrontend's PremiumServices section showed when it was
// hard-coded, so the admin form opens already filled in.
export const FEATURES_DEFAULTS: FeaturesContent = {
  heading: 'Home repairs everywhere,\nimpactful online services,\nenhanced experiences',
  highlight: 'impactful online services,',
  description:
    'CityCalls is dedicated to providing accessible, high-quality home repairs. From emergency plumbing to deep cleaning, ' +
    'our verified experts ensure every service is engaging, effective, and tailored to meet the diverse needs of your ' +
    'modern household. We bring premium care right to your doorstep, exactly when you need it.',
  image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80',
  imageAlt: 'CityCalls Premium Service',
  imageBadge: 'Top Rated',
  items: [
    { icon: 'wrench', title: 'Expert Plumbers', description: 'Quick and reliable plumbing services for leaks, fittings, and repairs.' },
    { icon: 'zap', title: 'Electrical Repairs', description: 'Certified electricians for wiring, appliance installation, and fault fixing.' },
    { icon: 'sparkles', title: 'Deep Cleaning', description: 'Professional cleaning services for a spotless home and fresh ambiance.' },
    { icon: 'shield-check', title: 'Appliance Service', description: 'AC, RO, and Washing Machine repair by verified technicians.' },
  ],
  status: 'ACTIVE',
};

export function cloneFeaturesDefaults(): FeaturesContent {
  return { ...FEATURES_DEFAULTS, items: FEATURES_DEFAULTS.items.map((item) => ({ ...item })) };
}

const featureItemSchema = new Schema<FeatureItem>(
  {
    icon: { type: String, enum: FEATURE_ICONS, default: 'wrench' },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false }
);

const featuresSchema = new Schema<IFeatures>(
  {
    key: { type: String, required: true, unique: true, default: FEATURES_KEY },
    heading: { type: String, required: true, trim: true, maxlength: 200 },
    highlight: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAlt: { type: String, trim: true, maxlength: 200, default: '' },
    imageBadge: { type: String, trim: true, maxlength: 40, default: '' },
    items: { type: [featureItemSchema], default: [] },
    status: { type: String, enum: FEATURES_STATUSES, default: 'ACTIVE' },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const FeaturesModel = model<IFeatures>('CityCallsHomeFeatures', featuresSchema, 'cityCallsHomeFeatures');
