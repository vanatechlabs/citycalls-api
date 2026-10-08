import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

// Admin → Website Section → FAQ: the home page's "Frequently Asked Questions"
// accordion. Each question has a picture shown beside it while it's open.

export const FAQ_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type FaqStatus = (typeof FAQ_STATUSES)[number];

export const FAQ_SECTION_KEY = 'home';

export interface FaqContent {
  question: string;
  answer: string;
  image: string;
  altText: string;
  sortOrder: number;
  status: FaqStatus;
}

export interface IFaq extends Document, FaqContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true, maxlength: 200 },
    answer: { type: String, required: true, trim: true, maxlength: 1500 },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    altText: { type: String, trim: true, maxlength: 200, default: '' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: FAQ_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

faqSchema.index({ status: 1, sortOrder: 1 });

export const FaqModel = model<IFaq>('CityCallsHomeFaq', faqSchema, 'cityCallsHomeFaqs');

// ─── Section headings (single document) ────────────────────────────────────
export interface FaqSectionContent {
  subheading: string;
  heading: string;
  // Part of the heading shown in green.
  highlightedWord: string;
  description: string;
}

export interface IFaqSection extends Document, FaqSectionContent {
  key: string;
  // Set once the default questions have been created, so deleting them all
  // in admin doesn't bring them back.
  seeded: boolean;
  updatedBy?: ActorSnapshot;
}

const faqSectionSchema = new Schema<IFaqSection>(
  {
    key: { type: String, required: true, unique: true },
    subheading: { type: String, trim: true, maxlength: 60, default: '' },
    heading: { type: String, required: true, trim: true, maxlength: 120 },
    highlightedWord: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    seeded: { type: Boolean, default: false },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const FaqSectionModel = model<IFaqSection>('CityCallsHomeFaqSection', faqSectionSchema, 'cityCallsHomeFaqSection');

// What the website showed before this was editable.
export const FAQ_SECTION_DEFAULTS: FaqSectionContent = {
  subheading: 'Support & Info',
  heading: 'Frequently Asked Questions',
  highlightedWord: 'Questions',
  description: 'Find answers to common inquiries about booking, services, and policies with CityCalls.',
};

export const FAQ_DEFAULTS: FaqContent[] = [
  {
    question: 'How quickly can I get a technician?',
    answer: 'For most services in Ghaziabad, we dispatch a pro within 60–90 minutes of booking. You can also schedule a specific slot up to 7 days out.',
    image: '/assets/Services/s1.png', altText: 'CityCalls technician arriving for a home service visit', sortOrder: 1, status: 'ACTIVE',
  },
  {
    question: 'Do I pay before or after the service?',
    answer: 'Always after. You inspect the work, then pay by UPI, card, wallet or cash.',
    image: '/assets/Banner/cara1.png', altText: 'Customer paying after a completed CityCalls service', sortOrder: 2, status: 'ACTIVE',
  },
  {
    question: 'Is there a service warranty?',
    answer: "Yes. All repairs come with a 30-day service warranty on labour. Spare parts carry the manufacturer's warranty.",
    image: '/assets/Services/s2.png', altText: 'Appliance repaired with a 30-day service warranty', sortOrder: 3, status: 'ACTIVE',
  },
  {
    question: 'Are the technicians background-verified?',
    answer: 'Every professional is police-verified, trained by CityCalls, and continuously rated by customers. Low-rated pros are removed from the platform.',
    image: '/assets/Services/s3.png', altText: 'Verified CityCalls professional at work', sortOrder: 4, status: 'ACTIVE',
  },
  {
    question: "What if I'm not happy with the service?",
    answer: "Raise a complaint from your booking page. We'll send another pro at no cost or refund the visit charge — your call.",
    image: '/assets/Banner/cara2.png', altText: 'CityCalls support resolving a customer complaint', sortOrder: 5, status: 'ACTIVE',
  },
  {
    question: 'Do you serve areas outside Ghaziabad?',
    answer: "Right now we're focused on Ghaziabad. Noida, Delhi and Meerut are on our roadmap for 2026.",
    image: '/assets/Services/s4.png', altText: 'CityCalls service area across Ghaziabad', sortOrder: 6, status: 'ACTIVE',
  },
];
