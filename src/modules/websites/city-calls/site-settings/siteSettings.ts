import { Schema, model } from 'mongoose';
import { z } from 'zod';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

// Admin Section → Settings → Website look. Site-wide switches for the public
// CityCalls website.

export const siteSettingsSchema = z.object({
  // ON: the solid black navbar on every page. OFF: the navbar is see-through
  // over pages that open with a photo banner (and turns to glass on scroll).
  solidNavbar: z.boolean(),
}).strict();

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = { solidNavbar: false };

interface SettingsDoc extends SiteSettings {
  _id: string;
  updatedBy?: ActorSnapshot;
  updatedAt?: Date;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    _id: { type: String, required: true },
    solidNavbar: { type: Boolean, default: false },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);
const SettingsModel = model<SettingsDoc>('CityCallsSiteSettings', settingsSchema, 'cityCallsSiteSettings');

const SETTINGS_ID = 'default';

export async function getSiteSettings(): Promise<SiteSettings & { updatedBy?: ActorSnapshot; updatedAt?: Date }> {
  const doc = await SettingsModel.findById(SETTINGS_ID).lean();
  if (!doc) return { ...DEFAULT_SITE_SETTINGS };
  return { solidNavbar: !!doc.solidNavbar, updatedBy: doc.updatedBy, updatedAt: doc.updatedAt };
}

// What the website needs — no "who saved it".
export async function getPublicSiteSettings(): Promise<SiteSettings> {
  const { solidNavbar } = await getSiteSettings();
  return { solidNavbar };
}

export async function updateSiteSettings(data: SiteSettings, actor: ActorSnapshot) {
  await SettingsModel.findByIdAndUpdate(SETTINGS_ID, { ...data, updatedBy: actor }, { upsert: true, runValidators: true });
  return getSiteSettings();
}
