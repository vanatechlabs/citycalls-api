import { Document, Schema, model } from 'mongoose';

export const LAUNCH_SPOTLIGHT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type LaunchSpotlightStatus = (typeof LAUNCH_SPOTLIGHT_STATUSES)[number];

export const LAUNCH_SPOTLIGHT_KEY = 'home';
export const DEFAULT_ACCENT_COLOR = '#7cb342';
// Darkness (0–100 %) of the gradient over the card image at its darkest
// (bottom) edge. null = the website's default look.
export const MAX_SPOTLIGHT_OVERLAY_OPACITY = 100;

export interface LaunchSpotlightSlide {
  id: string;
  image: string;
  altText: string;
  badgeText: string;
  heading: string;
  subheading: string;
  link: string;
  accentColor: string;
  overlayOpacity?: number | null;
  sortOrder: number;
  status: LaunchSpotlightStatus;
}

export interface ILaunchSpotlight extends Document {
  key: string;
  slides: LaunchSpotlightSlide[];
  createdAt: Date;
  updatedAt: Date;
}

// These defaults mirror the two cards that were hard-coded in
// nextfrontend's LaunchSpotlight component before this CMS screen existed.
export const LAUNCH_SPOTLIGHT_DEFAULTS: LaunchSpotlightSlide[] = [
  {
    id: 'help-now',
    image: '/assets/Banner/h2.png',
    altText: 'HelpNow home services professional',
    badgeText: 'NEW LAUNCH',
    heading: 'HelpNow',
    subheading: 'Service Under 60 Mins',
    link: 'https://helpnow.citycalls.in/',
    accentColor: '#f5a623',
    sortOrder: 0,
    status: 'ACTIVE',
  },
  {
    id: 'beauty-salon',
    image: '/assets/Banner/cara8.png',
    altText: 'Beauty and salon service at home',
    badgeText: 'NEW LAUNCH',
    heading: 'Beauty & Salon',
    subheading: 'Luxury Salon at Home',
    link: 'https://salon.citycalls.in/',
    accentColor: '#d4af37',
    sortOrder: 1,
    status: 'ACTIVE',
  },
];

const launchSpotlightSlideSchema = new Schema<LaunchSpotlightSlide>(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    // Every field is optional in admin; a slide without an image is kept but
    // not shown on the website.
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    altText: { type: String, trim: true, maxlength: 160, default: '' },
    badgeText: { type: String, trim: true, maxlength: 40, default: '' },
    heading: { type: String, trim: true, maxlength: 80, default: '' },
    subheading: { type: String, trim: true, maxlength: 120, default: '' },
    link: { type: String, trim: true, maxlength: 500, default: '' },
    accentColor: { type: String, trim: true, maxlength: 7, default: DEFAULT_ACCENT_COLOR },
    overlayOpacity: { type: Number, min: 0, max: MAX_SPOTLIGHT_OVERLAY_OPACITY, default: null },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: LAUNCH_SPOTLIGHT_STATUSES, default: 'ACTIVE' },
  },
  { _id: false }
);

const launchSpotlightSchema = new Schema<ILaunchSpotlight>(
  {
    key: { type: String, required: true, unique: true, default: LAUNCH_SPOTLIGHT_KEY },
    slides: {
      type: [launchSpotlightSlideSchema],
      required: true,
      default: () => LAUNCH_SPOTLIGHT_DEFAULTS.map((slide) => ({ ...slide })),
    },
  },
  { timestamps: true }
);

export const LaunchSpotlightModel = model<ILaunchSpotlight>(
  'CityCallsHomeLaunchSpotlight',
  launchSpotlightSchema,
  'cityCallsHomeLaunchSpotlight'
);
