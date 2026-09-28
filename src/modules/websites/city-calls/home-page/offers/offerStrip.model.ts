import { Document, Schema, model } from 'mongoose';

export const OFFER_STRIP_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type OfferStripStatus = (typeof OFFER_STRIP_STATUSES)[number];

// The home page has exactly one offer strip, so the document is a singleton
// addressed by this fixed key rather than by its Mongo id.
export const OFFER_STRIP_KEY = 'home';

export interface IOfferStrip extends Document {
  key: string;
  textLeft: string;
  discountText: string;
  textRight: string;
  couponCode: string;
  buttonText: string;
  buttonLink: string;
  bgGradientFrom: string;
  bgGradientVia: string;
  bgGradientTo: string;
  discountBg: string;
  discountTextColor: string;
  couponBg: string;
  couponTextColor: string;
  status: OfferStripStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Defaults mirror the strip nextfrontend's OfferStrip.tsx shipped with before
// it was CMS-driven, so the first save never changes what visitors see.
export const OFFER_STRIP_DEFAULTS = {
  textLeft: 'Special Home Services Discount —',
  discountText: 'FLAT 15% OFF',
  textRight: 'on your first booking. Use code',
  couponCode: 'CITY15',
  buttonText: 'Claim Offer',
  buttonLink: '/services',
  bgGradientFrom: '#020617',
  bgGradientVia: '#0d131f',
  bgGradientTo: '#020617',
  discountBg: '#7cb342',
  discountTextColor: '#020617',
  couponBg: 'rgba(251, 191, 36, 0.12)',
  couponTextColor: '#fcd34d',
  status: 'ACTIVE' as OfferStripStatus,
};

const offerStripSchema = new Schema<IOfferStrip>(
  {
    key: { type: String, required: true, unique: true, default: OFFER_STRIP_KEY },
    textLeft: { type: String, trim: true, maxlength: 120, default: OFFER_STRIP_DEFAULTS.textLeft },
    discountText: { type: String, trim: true, maxlength: 60, default: OFFER_STRIP_DEFAULTS.discountText },
    textRight: { type: String, trim: true, maxlength: 160, default: OFFER_STRIP_DEFAULTS.textRight },
    couponCode: { type: String, trim: true, maxlength: 40, default: OFFER_STRIP_DEFAULTS.couponCode },
    buttonText: { type: String, trim: true, maxlength: 40, default: OFFER_STRIP_DEFAULTS.buttonText },
    buttonLink: { type: String, trim: true, maxlength: 500, default: OFFER_STRIP_DEFAULTS.buttonLink },
    bgGradientFrom: { type: String, trim: true, maxlength: 200, default: OFFER_STRIP_DEFAULTS.bgGradientFrom },
    bgGradientVia: { type: String, trim: true, maxlength: 200, default: OFFER_STRIP_DEFAULTS.bgGradientVia },
    bgGradientTo: { type: String, trim: true, maxlength: 200, default: OFFER_STRIP_DEFAULTS.bgGradientTo },
    discountBg: { type: String, trim: true, maxlength: 100, default: OFFER_STRIP_DEFAULTS.discountBg },
    discountTextColor: { type: String, trim: true, maxlength: 100, default: OFFER_STRIP_DEFAULTS.discountTextColor },
    couponBg: { type: String, trim: true, maxlength: 100, default: OFFER_STRIP_DEFAULTS.couponBg },
    couponTextColor: { type: String, trim: true, maxlength: 100, default: OFFER_STRIP_DEFAULTS.couponTextColor },
    status: { type: String, enum: OFFER_STRIP_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const OfferStripModel = model<IOfferStrip>('CityCallsHomeOfferStrip', offerStripSchema, 'cityCallsHomeOfferStrip');
