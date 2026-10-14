import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

export const PAGE_PARALLAX_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type PageParallaxStatus = (typeof PAGE_PARALLAX_STATUSES)[number];

// The parallax banner in the middle of one website service page (wide photo
// that drifts on scroll, with text over it), addressed by the page's path
// ("/services/ac-service"). The page keeps its own banner when there is none.
export interface IPageParallax extends Document {
  pagePath: string;
  // Small green line above the heading — "Appliance Repair".
  subheading?: string;
  // "Expert Repair at Your Doorstep".
  heading: string;
  // Part of the heading shown in green — "Your Doorstep".
  highlight?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  status: PageParallaxStatus;
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const pageParallaxSchema = new Schema<IPageParallax>(
  {
    pagePath: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 300 },
    subheading: { type: String, trim: true, maxlength: 120 },
    heading: { type: String, required: true, trim: true, maxlength: 180 },
    highlight: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, trim: true },
    imageAlt: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: PAGE_PARALLAX_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const PageParallaxModel = model<IPageParallax>('CityCallsPageParallax', pageParallaxSchema, 'cityCallsPageParallax');
