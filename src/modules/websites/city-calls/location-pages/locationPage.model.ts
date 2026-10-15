import { Document, Schema, Types, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

// Admin → Blog Section → Add Location Page: SEO pages for one service (or the
// home page) in one city, e.g. citycalls.in/refrigerator-service-in-noida —
// like Design House's location pages. Hero like a service page, the admin's
// rich text below it, then that service's cards titled for the city.
export const LOCATION_PAGE_STATUSES = ['PUBLISHED', 'DRAFT'] as const;
export type LocationPageStatus = (typeof LOCATION_PAGE_STATUSES)[number];

// HOME = the whole of CityCalls ("Home Services in Noida"); SERVICE = one
// Navbar List service link.
export const LOCATION_PAGE_TYPES = ['HOME', 'SERVICE'] as const;
export type LocationPageType = (typeof LOCATION_PAGE_TYPES)[number];

export interface LocationPageFeature {
  title: string;
  subtitle: string;
}

export interface LocationPageContent {
  pageType: LocationPageType;
  navServiceId?: Types.ObjectId;
  // Copied from the Navbar List link when saved, so the page still reads
  // right if the link is later renamed or removed.
  serviceName: string;
  servicePath: string;
  menuName: string;
  location: string;
  slug: string;
  // Hero
  heroEyebrow: string;
  title: string;
  highlight: string;
  shortDescription: string;
  features: LocationPageFeature[];
  heroImage: string;
  heroImageAlt: string;
  // Content below the hero
  highlightedHeading: string;
  content: string;
  // SEO
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  canonicalTag: string;
  ogTitle: string;
  ogImage: string;
  schemaMarkup: string;
  status: LocationPageStatus;
}

export interface ILocationPage extends Document, LocationPageContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema<LocationPageFeature>(
  {
    title: { type: String, required: true, trim: true, maxlength: 40 },
    subtitle: { type: String, trim: true, maxlength: 40, default: '' },
  },
  { _id: false }
);

const locationPageSchema = new Schema<ILocationPage>(
  {
    pageType: { type: String, enum: LOCATION_PAGE_TYPES, required: true },
    navServiceId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarService' },
    serviceName: { type: String, required: true, trim: true, maxlength: 150 },
    servicePath: { type: String, required: true, trim: true, maxlength: 300 },
    menuName: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 160, unique: true },
    heroEyebrow: { type: String, trim: true, maxlength: 80, default: '' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    highlight: { type: String, trim: true, maxlength: 100, default: '' },
    shortDescription: { type: String, required: true, trim: true, maxlength: 700 },
    features: { type: [featureSchema], default: [] },
    heroImage: { type: String, trim: true, maxlength: 2048, default: '' },
    heroImageAlt: { type: String, trim: true, maxlength: 200, default: '' },
    highlightedHeading: { type: String, trim: true, maxlength: 200, default: '' },
    content: { type: String, required: true, maxlength: 200_000 },
    metaTitle: { type: String, trim: true, maxlength: 70, default: '' },
    metaKeywords: { type: String, trim: true, maxlength: 500, default: '' },
    metaDescription: { type: String, trim: true, maxlength: 170, default: '' },
    canonicalTag: { type: String, trim: true, maxlength: 500, default: '' },
    ogTitle: { type: String, trim: true, maxlength: 200, default: '' },
    ogImage: { type: String, trim: true, maxlength: 2048, default: '' },
    schemaMarkup: { type: String, maxlength: 20_000, default: '' },
    status: { type: String, enum: LOCATION_PAGE_STATUSES, default: 'DRAFT' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

locationPageSchema.index({ status: 1, servicePath: 1 });

export const LocationPageModel = model<ILocationPage>('CityCallsLocationPage', locationPageSchema, 'cityCallsLocationPages');
