import { Schema, model } from 'mongoose';
import { z } from 'zod';
import { ActorSnapshot, actorSnapshotSchema } from '../../lib/actor';

// Registration number series, set in Admin → Settings → Registration Number.
// Default CC + YYYY + MM + DD + a running number for that day, e.g.
// CC2026100705 = CityCalls, 7 Oct 2026, 5th registration of the day.
// The running number restarts at 01 whenever the date part changes — daily
// with the day in the number, monthly with only year + month, and so on.

export const registrationNumberSettingsSchema = z.object({
  prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,10}$/, 'Prefix: 1–10 letters or digits'),
  includeYear: z.boolean(),
  includeMonth: z.boolean(),
  includeDay: z.boolean(),
  // Digits in the running number (01, 001, …). Grows past this if a day overflows.
  sequenceDigits: z.number().int().min(2).max(6),
  // Between prefix, date and running number: none (CC2026100705) or "-" / "/".
  separator: z.enum(['', '-', '/']),
}).strict();

export type RegistrationNumberSettings = z.infer<typeof registrationNumberSettingsSchema>;

export const DEFAULT_NUMBER_SETTINGS: RegistrationNumberSettings = {
  prefix: 'CC',
  includeYear: true,
  includeMonth: true,
  includeDay: true,
  sequenceDigits: 2,
  separator: '',
};

interface SettingsDoc extends RegistrationNumberSettings {
  _id: string;
  updatedBy?: ActorSnapshot;
  updatedAt?: Date;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    _id: { type: String, required: true },
    prefix: { type: String, required: true },
    includeYear: { type: Boolean, required: true },
    includeMonth: { type: Boolean, required: true },
    includeDay: { type: Boolean, required: true },
    sequenceDigits: { type: Number, required: true },
    separator: { type: String, default: '' },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);
const SettingsModel = model<SettingsDoc>('RegistrationNumberSettings', settingsSchema, 'registrationNumberSettings');

// One running counter per series stamp ("CC20261007" → last number used).
const counterSchema = new Schema<{ _id: string; seq: number }>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const CounterModel = model('RegistrationNumberCounter', counterSchema, 'registrationNumberCounters');

const SETTINGS_ID = 'default';

export async function getNumberSettings(): Promise<RegistrationNumberSettings & { updatedBy?: ActorSnapshot; updatedAt?: Date }> {
  const doc = await SettingsModel.findById(SETTINGS_ID).lean();
  if (!doc) return { ...DEFAULT_NUMBER_SETTINGS };
  const { prefix, includeYear, includeMonth, includeDay, sequenceDigits, separator, updatedBy, updatedAt } = doc;
  return { prefix, includeYear, includeMonth, includeDay, sequenceDigits, separator: separator as RegistrationNumberSettings['separator'], updatedBy, updatedAt };
}

export async function updateNumberSettings(data: RegistrationNumberSettings, actor: ActorSnapshot) {
  await SettingsModel.findByIdAndUpdate(SETTINGS_ID, { ...data, updatedBy: actor }, { upsert: true, runValidators: true });
  return getNumberSettings();
}

// Today's date parts in India time (the server may run in UTC).
function indiaDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

// The part before the running number, e.g. "CC2026 10 07" → stamp parts.
function seriesParts(settings: RegistrationNumberSettings, now: Date) {
  const { year, month, day } = indiaDateParts(now);
  const date = `${settings.includeYear ? year : ''}${settings.includeMonth ? month : ''}${settings.includeDay ? day : ''}`;
  return [settings.prefix, date].filter(Boolean);
}

export function formatRegistrationNo(settings: RegistrationNumberSettings, seq: number, now = new Date()) {
  return [...seriesParts(settings, now), String(seq).padStart(settings.sequenceDigits, '0')].join(settings.separator);
}

// Takes the next number in today's series (atomic, so two bookings at the
// same moment never share one).
export async function nextRegistrationNo(now = new Date()) {
  const settings = await getNumberSettings();
  const stamp = seriesParts(settings, now).join('|');
  const counter = await CounterModel.findOneAndUpdate({ _id: stamp }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return formatRegistrationNo(settings, counter.seq, now);
}

// What the next registration would get, without using it up.
export async function previewNextRegistrationNo(now = new Date()) {
  const settings = await getNumberSettings();
  const counter = await CounterModel.findById(seriesParts(settings, now).join('|')).lean();
  return formatRegistrationNo(settings, (counter?.seq ?? 0) + 1, now);
}
