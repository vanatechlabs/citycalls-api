import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../lib/actor';

// Customer Section → All Customers: one profile per mobile number, across
// Service Calls (registrations), Call Enquiries and website enquiries. It
// only holds who the customer is (CityCalls ID + latest contact details);
// their history and counts are read live from those records, so the
// profile is never out of step with them.
export const CUSTOMER_ACTIVITY_SOURCES = ['SERVICE_CALL', 'CALL_ENQUIRY', 'WEBSITE_ENQUIRY'] as const;
export type CustomerActivitySource = (typeof CUSTOMER_ACTIVITY_SOURCES)[number];

export interface ICityCallsCustomer extends Document {
  // "CC-000123" — the customer's CityCalls ID.
  customerCode: string;
  // 10 digits, no +91 / spaces.
  phone: string;
  name: string;
  email?: string;
  altPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  firstSeenAt: Date;
  // Date of their latest call / enquiry; contact details follow that record.
  lastSeenAt: Date;
  lastSource: CustomerActivitySource;
  // Removed from All Customers (their calls / enquiries stay). A new call or
  // enquiry from the same mobile brings the profile back.
  deletedAt?: Date;
  deletedBy?: ActorSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICityCallsCustomer>(
  {
    customerCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    phone: { type: String, required: true, unique: true, trim: true, maxlength: 10 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    altPhone: { type: String, trim: true, maxlength: 15 },
    address: { type: String, trim: true, maxlength: 300 },
    city: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },
    pincode: { type: String, trim: true, maxlength: 6 },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    lastSource: { type: String, enum: CUSTOMER_ACTIVITY_SOURCES, required: true },
    deletedAt: { type: Date },
    deletedBy: { type: actorSnapshotSchema },
  },
  { timestamps: true }
);

customerSchema.index({ lastSeenAt: -1 });
customerSchema.index({ email: 1 });
customerSchema.index({ name: 1 });

export const CityCallsCustomerModel = model<ICityCallsCustomer>('CityCallsCustomer', customerSchema, 'cityCallsCustomers');

// One document: set once every existing call / enquiry has been turned into
// profiles, so the backfill runs only once.
const metaSchema = new Schema<{ _id: string; version: number; at: Date }>({
  _id: { type: String, required: true },
  version: { type: Number, required: true },
  at: { type: Date, required: true },
});
export const CustomerProfilesMetaModel = model('CityCallsCustomerMeta', metaSchema, 'cityCallsCustomerMeta');
