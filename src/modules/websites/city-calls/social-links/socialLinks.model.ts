import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

// The single settings document is stored under this key.
export const SOCIAL_LINKS_KEY = 'city-calls';

// Admin → SEO Section → Social Media. nextfrontend's social sidebar and the
// call / WhatsApp floating buttons read it.
export interface ISocialLinks extends Document {
  key: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  // Digits only with country code, as wa.me expects — "919876543210".
  whatsappNumber?: string;
  whatsappMessage?: string;
  // Dialled by the call button — "+919876543210".
  callNumber?: string;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const urlField = { type: String, trim: true, maxlength: 500 };

const socialLinksSchema = new Schema<ISocialLinks>(
  {
    key: { type: String, required: true, unique: true, default: SOCIAL_LINKS_KEY },
    facebook: urlField,
    instagram: urlField,
    twitter: urlField,
    linkedin: urlField,
    youtube: urlField,
    whatsappNumber: { type: String, trim: true, maxlength: 15 },
    whatsappMessage: { type: String, trim: true, maxlength: 500 },
    callNumber: { type: String, trim: true, maxlength: 16 },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const SocialLinksModel = model<ISocialLinks>('CityCallsSocialLinks', socialLinksSchema, 'cityCallsSocialLinks');
