import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

export const COUNTERS_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type CountersStatus = (typeof COUNTERS_STATUSES)[number];

// Icons the website can draw on a counter card (lucide names).
export const COUNTER_ICONS = [
  'users', 'shield-check', 'timer', 'star', 'award', 'thumbs-up', 'wrench', 'house', 'clock', 'map-pin',
] as const;
export type CounterIcon = (typeof COUNTER_ICONS)[number];

export const COUNTERS_KEY = 'home';
export const MAX_COUNTERS = 4;

export interface CounterItem {
  // Counts up to this; decimals are kept (4.8).
  value: number;
  // Shown after the number in green: "+", "%", " min", "★".
  suffix: string;
  label: string;
  icon: CounterIcon;
  image: string;
  imageAlt: string;
}

export interface CountersContent {
  items: CounterItem[];
  status: CountersStatus;
}

export interface ICounters extends Document, CountersContent {
  key: string;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

// Mirrors nextfrontend's TrustStrip when it was hard-coded.
export const COUNTERS_DEFAULTS: CountersContent = {
  items: [
    { value: 10000, suffix: '+', label: 'Happy Customers', icon: 'users', image: '/assets/Services/s1.png', imageAlt: 'CityCalls technician repairing a refrigerator' },
    { value: 100, suffix: '%', label: 'Verified Professionals', icon: 'shield-check', image: '/assets/Services/s2.png', imageAlt: 'Verified CityCalls technician servicing an AC' },
    { value: 60, suffix: ' min', label: 'Average Response Time', icon: 'timer', image: '/assets/Services/s3.png', imageAlt: 'CityCalls technician repairing a washing machine' },
    { value: 4.8, suffix: '★', label: 'Average Rating', icon: 'star', image: '/assets/Services/s4.png', imageAlt: 'CityCalls technician repairing a television' },
  ],
  status: 'ACTIVE',
};

export function cloneCountersDefaults(): CountersContent {
  return { ...COUNTERS_DEFAULTS, items: COUNTERS_DEFAULTS.items.map((item) => ({ ...item })) };
}

const counterItemSchema = new Schema<CounterItem>(
  {
    value: { type: Number, required: true, min: 0, max: 1_000_000_000 },
    suffix: { type: String, trim: false, maxlength: 10, default: '' },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    icon: { type: String, enum: COUNTER_ICONS, default: 'users' },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAlt: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false }
);

const countersSchema = new Schema<ICounters>(
  {
    key: { type: String, required: true, unique: true, default: COUNTERS_KEY },
    items: { type: [counterItemSchema], default: [] },
    status: { type: String, enum: COUNTERS_STATUSES, default: 'ACTIVE' },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const CountersModel = model<ICounters>('CityCallsHomeCounters', countersSchema, 'cityCallsHomeCounters');
