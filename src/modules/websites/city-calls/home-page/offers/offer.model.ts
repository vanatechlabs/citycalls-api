import { Document, Schema, model } from 'mongoose';

export const OFFER_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

// Icon names nextfrontend's SpotlightCarousel.tsx maps to lucide-react
// components — keep both lists in sync when adding one.
export const OFFER_ICONS = [
  'Gift', 'Fan', 'Sparkles', 'Zap', 'Droplets', 'ShieldCheck', 'Wrench', 'Bug', 'Scissors', 'Tag',
] as const;
export type OfferIcon = (typeof OFFER_ICONS)[number];

export interface IOffer extends Document {
  title: string;
  description?: string;
  couponCode?: string;
  icon: OfferIcon;
  accentColor: string;
  tintColor: string;
  sortOrder: number;
  status: OfferStatus;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 240 },
    couponCode: { type: String, trim: true, maxlength: 40 },
    icon: { type: String, enum: OFFER_ICONS, default: 'Gift' },
    // accentColor drives the card's title, icon and coupon text; tintColor is
    // the icon tile fill and the corner the card's background fades into.
    accentColor: { type: String, trim: true, maxlength: 100, default: '#3e8914' },
    tintColor: { type: String, trim: true, maxlength: 100, default: '#e8f5e9' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: OFFER_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

offerSchema.index({ status: 1, sortOrder: 1, createdAt: 1 });

export const OfferModel = model<IOffer>('CityCallsHomeOffer', offerSchema, 'cityCallsHomeOffers');
