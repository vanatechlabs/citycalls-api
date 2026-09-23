import { Document, Schema, model } from 'mongoose';

export const HERO_SLIDE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type HeroSlideStatus = (typeof HERO_SLIDE_STATUSES)[number];

export interface IHeroSlide extends Document {
  image?: string;
  altText?: string;
  subtitle: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  sortOrder: number;
  status: HeroSlideStatus;
  createdAt: Date;
  updatedAt: Date;
}

const heroSlideSchema = new Schema<IHeroSlide>(
  {
    // Image is attached immediately after creation by the shared file-upload
    // flow, once the new slide's Mongo id is available.
    image: { type: String, trim: true },
    altText: { type: String, trim: true, maxlength: 160 },
    subtitle: { type: String, required: true, trim: true, maxlength: 100 },
    titleLine1: { type: String, required: true, trim: true, maxlength: 120 },
    titleLine2: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: HERO_SLIDE_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

heroSlideSchema.index({ status: 1, sortOrder: 1, createdAt: 1 });

// Keep the original collection name so moving the code into its website/page
// namespace never strands slides that were created before the restructure.
export const HeroSlideModel = model<IHeroSlide>('CityCallsHomeHeroSlide', heroSlideSchema, 'heroslides');
