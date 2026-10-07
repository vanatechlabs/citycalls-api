import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

// Admin → Pages Section → Testimonials: the home page's "Loved by thousands of
// happy families" carousel. No photos — the card shows the reviewer's
// initials (first + last word of the name) in the chosen badge colour.

export const TESTIMONIAL_STATUSES = ['PUBLISHED', 'PENDING', 'HIDDEN'] as const;
export type TestimonialStatus = (typeof TESTIMONIAL_STATUSES)[number];

export const TESTIMONIALS_SECTION_KEY = 'home';

// ─── One review ────────────────────────────────────────────────────────────
export interface TestimonialContent {
  name: string;
  // What they booked or who they are, e.g. "AC Service customer".
  role: string;
  // Area / city, e.g. "Indirapuram".
  location: string;
  rating: number;
  message: string;
  // Initials badge colour (hex).
  color: string;
  sortOrder: number;
  status: TestimonialStatus;
}

export interface ITestimonial extends Document, TestimonialContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: String, trim: true, maxlength: 80, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    color: { type: String, trim: true, maxlength: 7, default: '#3e8914' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: TESTIMONIAL_STATUSES, default: 'PUBLISHED' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

testimonialSchema.index({ status: 1, sortOrder: 1 });

export const TestimonialModel = model<ITestimonial>('CityCallsHomeTestimonial', testimonialSchema, 'cityCallsHomeTestimonials');

// ─── Section heading + display rules (single document) ────────────────────
export interface TestimonialsSectionContent {
  eyebrow: string;
  heading: string;
  // Part of the heading shown in green.
  highlight: string;
  // Only published reviews with at least this many stars are shown.
  minRating: number;
}

export interface ITestimonialsSection extends Document, TestimonialsSectionContent {
  key: string;
  // Set once the default reviews have been created, so deleting every review
  // in admin doesn't bring the defaults back.
  seeded: boolean;
  updatedBy?: ActorSnapshot;
}

const testimonialsSectionSchema = new Schema<ITestimonialsSection>(
  {
    key: { type: String, required: true, unique: true },
    eyebrow: { type: String, trim: true, maxlength: 60, default: '' },
    heading: { type: String, required: true, trim: true, maxlength: 120 },
    highlight: { type: String, trim: true, maxlength: 80, default: '' },
    minRating: { type: Number, min: 1, max: 5, default: 1 },
    seeded: { type: Boolean, default: false },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const TestimonialsSectionModel = model<ITestimonialsSection>(
  'CityCallsHomeTestimonialsSection',
  testimonialsSectionSchema,
  'cityCallsHomeTestimonialsSection'
);

// What the website showed before this was editable.
export const TESTIMONIALS_SECTION_DEFAULTS: TestimonialsSectionContent = {
  eyebrow: 'What customers say',
  heading: 'Loved by thousands of happy families.',
  highlight: 'happy families.',
  minRating: 1,
};

export const TESTIMONIAL_DEFAULTS: TestimonialContent[] = [
  {
    name: 'Anjali M.', role: 'AC Service customer', location: 'Indirapuram', rating: 5, color: '#3e8914', sortOrder: 1, status: 'PUBLISHED',
    message: 'The AC service was so fast — booked at 10 AM, done by 12:30 PM. Technician was polite, wore shoe-covers, cleaned up after. My AC is cooling perfectly now just like it did when I first bought it. Highly recommend their prompt and professional service!',
  },
  {
    name: 'Vikram S.', role: 'Refrigerator Repair customer', location: 'Vaishali', rating: 5, color: '#0284c7', sortOrder: 2, status: 'PUBLISHED',
    message: 'Called for a fridge issue at 8 PM. They came next morning, gas refill done, saved me buying a new fridge. Prices are honest. The repairman even gave me some great maintenance tips to avoid ice buildup in the future. Will definitely use CityCalls again.',
  },
  {
    name: 'Priya R.', role: 'Bridal Makeup customer', location: 'Kaushambi', rating: 5, color: '#be185d', sortOrder: 3, status: 'PUBLISHED',
    message: 'Bridal makeup at home was flawless. HD products, trial included, the MUA gave 100%. Will 100% call for the next family wedding. She arrived exactly on time, was extremely patient with my requests, and made me feel so special on my big day.',
  },
  {
    name: 'Rohit K.', role: 'Home Deep Cleaning customer', location: 'Raj Nagar', rating: 4, color: '#d97706', sortOrder: 4, status: 'PUBLISHED',
    message: 'Deep cleaning of my 3BHK — team of 3, took 5 hours. My place looked new after. The kitchen chimney alone was worth the money. They brought all their own equipment and chemicals, and left literally no corner untouched. Extremely satisfied with the results.',
  },
  {
    name: 'Sneha D.', role: 'Pest Control customer', location: 'Crossings Republik', rating: 5, color: '#7c3aed', sortOrder: 5, status: 'PUBLISHED',
    message: "Pest control team was so professional. Odourless chemicals, explained everything. Cockroach problem — gone in 48 hours. I appreciate that they were very careful around my pets and kids. It's been two months and I haven't seen a single bug since!",
  },
];
