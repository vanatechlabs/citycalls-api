import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

export const PAGE_BACKGROUND_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type PageBackgroundStatus = (typeof PAGE_BACKGROUND_STATUSES)[number];

export const MAX_BACKGROUND_FEATURES = 4;

export interface IPageBackgroundFeature {
  title: string;
  subtitle: string;
}

// Hero banner (background image + text over it) for one website page,
// addressed by its path ("/services/ac-service"). nextfrontend's service
// page hero reads it and falls back to the page's own copy when missing.
export interface IPageBackground extends Document {
  pagePath: string;
  // Small caps line above the heading — "Professional & Reliable".
  subheading?: string;
  // The page's <h1> — "Refrigerator Service in Ghaziabad".
  heading: string;
  // Part of the heading shown in the accent colour — "Ghaziabad".
  highlight?: string;
  description?: string;
  // Up to 4 badges under the text — { title: "Expert", subtitle: "Technicians" }.
  features: IPageBackgroundFeature[];
  image?: string;
  imageAlt?: string;
  status: PageBackgroundStatus;
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema<IPageBackgroundFeature>(
  {
    title: { type: String, required: true, trim: true, maxlength: 40 },
    subtitle: { type: String, trim: true, maxlength: 40, default: '' },
  },
  { _id: false }
);

const pageBackgroundSchema = new Schema<IPageBackground>(
  {
    pagePath: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 300 },
    subheading: { type: String, trim: true, maxlength: 120 },
    heading: { type: String, required: true, trim: true, maxlength: 180 },
    highlight: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    features: { type: [featureSchema], default: [] },
    image: { type: String, trim: true },
    imageAlt: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: PAGE_BACKGROUND_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const PageBackgroundModel = model<IPageBackground>(
  'CityCallsPageBackground',
  pageBackgroundSchema,
  'cityCallsPageBackgrounds'
);
