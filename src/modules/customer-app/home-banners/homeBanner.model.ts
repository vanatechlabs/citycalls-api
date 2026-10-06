import { Document, Schema, model } from 'mongoose';

export const HOME_BANNER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type HomeBannerStatus = (typeof HOME_BANNER_STATUSES)[number];

// One slide of the top banner carousel on the customer mobile app's home
// screen — tag pill, two title lines (second one highlighted), description,
// a button label and a full-bleed background image.
export interface IHomeBanner extends Document {
  tagLine: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  buttonText: string;
  image?: string;
  altText?: string;
  sortOrder: number;
  status: HomeBannerStatus;
  createdAt: Date;
  updatedAt: Date;
}

const homeBannerSchema = new Schema<IHomeBanner>(
  {
    tagLine: { type: String, required: true, trim: true, maxlength: 60 },
    titleLine1: { type: String, required: true, trim: true, maxlength: 60 },
    titleLine2: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    buttonText: { type: String, required: true, trim: true, maxlength: 40 },
    // Attached right after creation by the shared file-upload flow, once the
    // new banner's Mongo id is available (same as the website hero slides).
    image: { type: String, trim: true },
    altText: { type: String, trim: true, maxlength: 160 },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: HOME_BANNER_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

homeBannerSchema.index({ status: 1, sortOrder: 1, createdAt: 1 });

export const HomeBannerModel = model<IHomeBanner>('CustomerAppHomeBanner', homeBannerSchema, 'customerapphomebanners');
