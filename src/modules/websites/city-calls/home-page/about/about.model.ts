import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

export const ABOUT_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type AboutStatus = (typeof ABOUT_STATUSES)[number];

export const ABOUT_KEY = 'home';
export const MAX_ABOUT_POINTS = 6;
// Image grid: [0] tall left image, [1] top right, [2] bottom right.
export const ABOUT_IMAGE_COUNT = 3;

export interface AboutImage {
  image: string;
  alt: string;
}

export interface AboutContent {
  eyebrow: string;
  heading: string;
  // Part of the heading shown in green with the underline swash.
  highlight: string;
  description: string;
  points: string[];
  missionTitle: string;
  missionText: string;
  visionTitle: string;
  visionText: string;
  buttonText: string;
  buttonLink: string;
  images: AboutImage[];
  status: AboutStatus;
}

export interface IAbout extends Document, AboutContent {
  key: string;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

// Mirrors what nextfrontend's AboutSection showed when it was hard-coded, so
// the admin form opens already filled in. Images are the website's own files.
export const ABOUT_DEFAULTS: AboutContent = {
  eyebrow: 'About CityCalls',
  heading: 'Your Trusted Home Services Partner in Ghaziabad',
  highlight: 'Home Services Partner',
  description:
    'We provide reliable and professional home services right at your doorstep. With a verified team of experts, ' +
    'transparent pricing, and a customer-first approach, we ensure every repair and service is a stress-free experience.',
  points: [
    'Background-verified and highly trained professionals',
    'Transparent, upfront pricing with no hidden charges',
    'Flexible bookings tailored to your schedule',
    'Dedicated customer support for a hassle-free experience',
  ],
  missionTitle: 'Our Mission',
  missionText: 'To deliver safe, punctual, and premium home services that consistently exceed customer expectations.',
  visionTitle: 'Our Vision',
  visionText: 'To be the leading and most trusted home service brand, setting new benchmarks in quality and reliability.',
  buttonText: 'Discover More',
  buttonLink: '/about',
  images: [
    { image: '/assets/Images/about1.png', alt: 'CityCalls Professional Cleaning' },
    { image: '/assets/Images/about2.png', alt: 'CityCalls Technician with Happy Family' },
    { image: '/assets/Images/about3.png', alt: 'CityCalls Team Collaboration' },
  ],
  status: 'ACTIVE',
};

export function cloneAboutDefaults(): AboutContent {
  return {
    ...ABOUT_DEFAULTS,
    points: [...ABOUT_DEFAULTS.points],
    images: ABOUT_DEFAULTS.images.map((img) => ({ ...img })),
  };
}

const aboutImageSchema = new Schema<AboutImage>(
  {
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    alt: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false }
);

const aboutSchema = new Schema<IAbout>(
  {
    key: { type: String, required: true, unique: true, default: ABOUT_KEY },
    eyebrow: { type: String, trim: true, maxlength: 60, default: '' },
    heading: { type: String, required: true, trim: true, maxlength: 160 },
    highlight: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    points: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
    missionTitle: { type: String, trim: true, maxlength: 60, default: '' },
    missionText: { type: String, trim: true, maxlength: 300, default: '' },
    visionTitle: { type: String, trim: true, maxlength: 60, default: '' },
    visionText: { type: String, trim: true, maxlength: 300, default: '' },
    buttonText: { type: String, trim: true, maxlength: 40, default: '' },
    buttonLink: { type: String, trim: true, maxlength: 500, default: '' },
    images: { type: [aboutImageSchema], default: [] },
    status: { type: String, enum: ABOUT_STATUSES, default: 'ACTIVE' },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const AboutModel = model<IAbout>('CityCallsHomeAbout', aboutSchema, 'cityCallsHomeAbout');
