import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../../lib/actor';

export const PACKAGE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

export const PACKAGES_SECTION_KEY = 'home';

// ─── One package card ──────────────────────────────────────────────────────
export interface PackageContent {
  name: string;
  duration: string;
  // Rupees, "Starting from ₹…".
  price: number;
  image: string;
  imageAlt: string;
  // Shows the "Popular" badge on the card.
  featured: boolean;
  sortOrder: number;
  status: PackageStatus;
}

export interface IPopularPackage extends Document, PackageContent {
  createdBy?: ActorSnapshot;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const popularPackageSchema = new Schema<IPopularPackage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    duration: { type: String, trim: true, maxlength: 40, default: '' },
    price: { type: Number, required: true, min: 0, max: 1_000_000 },
    image: { type: String, trim: true, maxlength: 2048, default: '' },
    imageAlt: { type: String, trim: true, maxlength: 200, default: '' },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: PACKAGE_STATUSES, default: 'ACTIVE' },
    createdBy: { type: actorSnapshotSchema },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

popularPackageSchema.index({ status: 1, sortOrder: 1 });

export const PopularPackageModel = model<IPopularPackage>(
  'CityCallsHomePopularPackage',
  popularPackageSchema,
  'cityCallsHomePopularPackages'
);

// ─── Section heading (single document) ─────────────────────────────────────
export interface PackagesSectionContent {
  eyebrow: string;
  heading: string;
  // Part of the heading shown in green.
  highlight: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  status: PackageStatus;
}

export interface IPackagesSection extends Document, PackagesSectionContent {
  key: string;
  // Set once the default packages have been created, so deleting every
  // package in admin doesn't bring the defaults back.
  seeded: boolean;
  updatedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const packagesSectionSchema = new Schema<IPackagesSection>(
  {
    key: { type: String, required: true, unique: true, default: PACKAGES_SECTION_KEY },
    eyebrow: { type: String, trim: true, maxlength: 60, default: '' },
    heading: { type: String, required: true, trim: true, maxlength: 120 },
    highlight: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    buttonText: { type: String, trim: true, maxlength: 40, default: '' },
    buttonLink: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: PACKAGE_STATUSES, default: 'ACTIVE' },
    seeded: { type: Boolean, default: false },
    updatedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

export const PackagesSectionModel = model<IPackagesSection>(
  'CityCallsHomePackagesSection',
  packagesSectionSchema,
  'cityCallsHomePackagesSection'
);

// ─── Defaults: what nextfrontend's PopularPackages showed when hard-coded ──
export const PACKAGES_SECTION_DEFAULTS: PackagesSectionContent = {
  eyebrow: 'Top Choices',
  heading: 'EXPLORE OUR POPULAR PACKAGES',
  highlight: 'POPULAR PACKAGES',
  description:
    'Discover the most frequently booked home service packages by our customers in Ghaziabad. ' +
    'Enjoy transparent pricing and guaranteed professional service.',
  buttonText: 'Explore All Services',
  buttonLink: '/services',
  status: 'ACTIVE',
};

export const PACKAGE_DEFAULTS: PackageContent[] = [
  { name: 'Split AC Servicing', duration: '1 hr', price: 499, image: '/assets/Images/ac1.png', imageAlt: 'Technician servicing a split AC', featured: true },
  { name: 'Window AC Servicing', duration: '1 hr', price: 449, image: '/assets/Images/ac2.png', imageAlt: 'Technician servicing a window AC', featured: true },
  { name: 'Complete Pest Control', duration: '2-3 hrs', price: 1299, image: '/assets/Images/a1.webp', imageAlt: 'Pest control treatment at home', featured: true },
  { name: 'Geyser Service & Repair', duration: '45 mins', price: 299, image: '/assets/Images/a2.webp', imageAlt: 'Geyser service and repair', featured: true },
  { name: 'Chimney Deep Cleaning', duration: '1.5 hrs', price: 899, image: '/assets/Images/a3.webp', imageAlt: 'Kitchen chimney deep cleaning', featured: false },
  { name: 'Premium Sofa Cleaning', duration: '2 hrs', price: 899, image: '/assets/Images/a4.webp', imageAlt: 'Premium sofa cleaning at home', featured: true },
  { name: 'RO Water Purifier Service', duration: '1 hr', price: 399, image: '/assets/Images/a5.webp', imageAlt: 'RO water purifier service', featured: false },
  { name: 'Full Home Deep Cleaning', duration: '5-6 hrs', price: 3499, image: '/assets/Images/a6.webp', imageAlt: 'Full home deep cleaning service', featured: true },
].map((pkg, sortOrder) => ({ ...pkg, sortOrder, status: 'ACTIVE' as const }));
