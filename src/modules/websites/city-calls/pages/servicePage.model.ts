import { Document, Schema, model, Types } from 'mongoose';

export const SERVICE_PAGE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ServicePageStatus = (typeof SERVICE_PAGE_STATUSES)[number];

export interface IServicePageFeature {
  title: string;
  subtitle: string;
}

export interface IServicePageStep {
  badge: string;
  title: string;
  description: string;
}

export interface IServicePageStat {
  value: string;
  label: string;
}

export interface IServicePage extends Document {
  navServiceId: Types.ObjectId;
  menuId: Types.ObjectId;
  slug: string;
  heroImage?: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  heroFeatures: IServicePageFeature[];
  walkthroughEyebrow: string;
  walkthroughTitle: string;
  walkthroughHighlight: string;
  walkthroughDescription: string;
  steps: IServicePageStep[];
  statsTitle: string;
  statsHighlight: string;
  stats: IServicePageStat[];
  bannerEyebrow: string;
  bannerTitle: string;
  bannerHighlight: string;
  bannerDescription: string;
  bannerImage?: string;
  areasTitle: string;
  areasHighlight: string;
  areasDescription: string;
  areas: string[];
  status: ServicePageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const featureSchema = new Schema<IServicePageFeature>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    subtitle: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { _id: false }
);

const stepSchema = new Schema<IServicePageStep>(
  {
    badge: { type: String, required: true, trim: true, maxlength: 30 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const statSchema = new Schema<IServicePageStat>(
  {
    value: { type: String, required: true, trim: true, maxlength: 30 },
    label: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false }
);

const servicePageSchema = new Schema<IServicePage>(
  {
    navServiceId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarService', required: true, unique: true },
    menuId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarMenu', required: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 120 },
    heroImage: { type: String, trim: true },
    heroEyebrow: { type: String, required: true, trim: true, maxlength: 120 },
    heroTitle: { type: String, required: true, trim: true, maxlength: 180 },
    heroHighlight: { type: String, required: true, trim: true, maxlength: 100 },
    heroDescription: { type: String, required: true, trim: true, maxlength: 700 },
    heroFeatures: { type: [featureSchema], required: true },
    walkthroughEyebrow: { type: String, required: true, trim: true, maxlength: 120 },
    walkthroughTitle: { type: String, required: true, trim: true, maxlength: 160 },
    walkthroughHighlight: { type: String, required: true, trim: true, maxlength: 100 },
    walkthroughDescription: { type: String, required: true, trim: true, maxlength: 700 },
    steps: { type: [stepSchema], required: true },
    statsTitle: { type: String, required: true, trim: true, maxlength: 120 },
    statsHighlight: { type: String, required: true, trim: true, maxlength: 80 },
    stats: { type: [statSchema], required: true },
    bannerEyebrow: { type: String, required: true, trim: true, maxlength: 120 },
    bannerTitle: { type: String, required: true, trim: true, maxlength: 180 },
    bannerHighlight: { type: String, required: true, trim: true, maxlength: 100 },
    bannerDescription: { type: String, required: true, trim: true, maxlength: 700 },
    bannerImage: { type: String, trim: true },
    areasTitle: { type: String, required: true, trim: true, maxlength: 180 },
    areasHighlight: { type: String, required: true, trim: true, maxlength: 100 },
    areasDescription: { type: String, required: true, trim: true, maxlength: 700 },
    areas: { type: [{ type: String, trim: true, maxlength: 100 }], required: true },
    status: { type: String, enum: SERVICE_PAGE_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

servicePageSchema.index({ status: 1, slug: 1 });

export const ServicePageModel = model<IServicePage>('CityCallsServicePage', servicePageSchema, 'citycallsservicepages');
