import { Document, Schema, Types, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

export const OUR_SERVICE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type OurServiceStatus = (typeof OUR_SERVICE_STATUSES)[number];

export const OUR_SERVICES_SECTION_KEY = 'home';

// ─── One service card ──────────────────────────────────────────────────────
// Picked from a Navbar List service link; its website path comes from that
// link (kept in sync when the link changes), `path` is the fallback.
export interface OurServiceContent {
  navServiceId?: Types.ObjectId;
  name: string;
  path: string;
  shortDescription: string;
  image: string;
  imageAlt: string;
  // Shown on the card's image, e.g. "₹299 visit charge".
  priceText: string;
  sortOrder: number;
  status: OurServiceStatus;
}

export interface IOurService extends Document, OurServiceContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const ourServiceSchema = new Schema<IOurService>(
  {
    navServiceId: { type: Schema.Types.ObjectId, ref: 'CityCallsNavbarService' },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    path: { type: String, required: true, trim: true, maxlength: 300 },
    shortDescription: { type: String, trim: true, maxlength: 200, default: '' },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAlt: { type: String, trim: true, maxlength: 200, default: '' },
    priceText: { type: String, trim: true, maxlength: 60, default: '' },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: OUR_SERVICE_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

ourServiceSchema.index({ status: 1, sortOrder: 1 });

export const OurServiceModel = model<IOurService>('CityCallsHomeOurService', ourServiceSchema, 'cityCallsHomeOurServices');

// ─── Section heading (single document) ─────────────────────────────────────
export interface OurServicesSectionContent {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  status: OurServiceStatus;
}

export interface IOurServicesSection extends Document, OurServicesSectionContent {
  key: string;
  // Set once the default cards are created, so deleting every card doesn't
  // bring them back.
  seeded: boolean;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const ourServicesSectionSchema = new Schema<IOurServicesSection>(
  {
    key: { type: String, required: true, unique: true, default: OUR_SERVICES_SECTION_KEY },
    eyebrow: { type: String, trim: true, maxlength: 60, default: '' },
    heading: { type: String, required: true, trim: true, maxlength: 160 },
    highlight: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    buttonText: { type: String, trim: true, maxlength: 40, default: '' },
    buttonLink: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: OUR_SERVICE_STATUSES, default: 'ACTIVE' },
    seeded: { type: Boolean, default: false },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const OurServicesSectionModel = model<IOurServicesSection>(
  'CityCallsHomeOurServicesSection',
  ourServicesSectionSchema,
  'cityCallsHomeOurServicesSection'
);

// ─── Defaults: the 12 cards nextfrontend's ServicesGrid showed hard-coded ──
export const OUR_SERVICES_SECTION_DEFAULTS: OurServicesSectionContent = {
  eyebrow: 'Our services',
  heading: 'Everything your home needs — one tap away.',
  highlight: 'one tap away.',
  description: 'Handpicked, background-verified professionals across appliance repair, cleaning, pest control, beauty and more.',
  buttonText: 'Explore All Services',
  buttonLink: '/services',
  status: 'ACTIVE',
};

const VISIT = '₹299 visit charge';
export const OUR_SERVICE_DEFAULTS: Omit<OurServiceContent, 'navServiceId'>[] = [
  { name: 'Refrigerator Service', path: '/services/refrigerator-service', shortDescription: 'Cooling issues, gas refill, ice buildup — sorted at your doorstep.', image: '/assets/Services/s1.png', imageAlt: 'Technician repairing a refrigerator' },
  { name: 'AC Service', path: '/services/ac-service', shortDescription: 'Deep-clean, gas top-up, installation & repair for every AC.', image: '/assets/Services/s2.png', imageAlt: 'Technician servicing a split AC' },
  { name: 'Washing Machine Services', path: '/services/washing-machine-services', shortDescription: 'Top-load, front-load, semi-automatic — repaired the same day.', image: '/assets/Services/s3.png', imageAlt: 'Technician repairing a washing machine' },
  { name: 'Television Repair Services', path: '/services/television-repair-services', shortDescription: 'LED, LCD, Smart TV — panel, board and speaker fixes.', image: '/assets/Services/s4.png', imageAlt: 'Technician repairing a television' },
  { name: 'Microwave & Oven Services', path: '/services/microwave-oven-services', shortDescription: 'Solo, grill, convection — fast diagnostics & repair.', image: '/assets/Services/s5.png', imageAlt: 'Technician repairing a microwave oven' },
  { name: 'Geyser Repair Services', path: '/services/geyser-repair-services', shortDescription: 'Instant & storage geysers — repaired, installed, replaced.', image: '/assets/Services/s6.png', imageAlt: 'Technician repairing a geyser' },
  { name: 'Chimney Repair Services', path: '/services/chimney-repair-services', shortDescription: 'Deep cleaning, motor repair, filter replacement.', image: '/assets/Services/s7.png', imageAlt: 'Technician cleaning a kitchen chimney' },
  { name: 'General Pest Control', path: '/services/general-pest-control', shortDescription: 'Full-home protection against cockroaches, ants, spiders & lizards.', image: '/assets/Services/s8.png', imageAlt: 'Pest control treatment at home' },
  { name: 'Termite Control', path: '/services/termite-control', shortDescription: 'Chemical drilling & injection — long-term termite protection.', image: 'https://images.unsplash.com/photo-1526397751294-331021109fbd?auto=format&fit=crop&w=1200&q=70', imageAlt: 'Termite control treatment' },
  { name: 'Sofa Shampooing', path: '/services/sofa-shampooing', shortDescription: 'Foam extraction cleaning for fabric sofas — like new again.', image: '/assets/Services/s10.png', imageAlt: 'Sofa shampooing at home' },
  { name: 'Kitchen Cleaning', path: '/services/kitchen-cleaning', shortDescription: 'Deep-degrease of every surface — cabinets to chimney.', image: '/assets/Services/s11.png', imageAlt: 'Kitchen deep cleaning service' },
  { name: 'Beauty & Salon', path: '/services/beauty-salon-services', shortDescription: 'At-home salon services for grooming and beauty.', image: '/assets/Services/s12.png', imageAlt: 'Beauty and salon service at home' },
].map((card, sortOrder) => ({ ...card, priceText: VISIT, sortOrder, status: 'ACTIVE' as const }));
