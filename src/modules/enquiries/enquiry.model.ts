import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../lib/actor';

// Enquiry Section: what visitors send from the website — the floating
// "Quick Book" form and the Contact page's "Send a Message" form. Staff work
// through them as Pending → Contacted → Resolved.
export const ENQUIRY_TYPES = ['QUICK_BOOKING', 'CONTACT'] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const ENQUIRY_STATUSES = ['PENDING', 'CONTACTED', 'RESOLVED'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

// SKIPPED = WhatsApp sending is switched off (AISENSY_ENABLED=false).
export const WHATSAPP_STATUSES = ['SENT', 'FAILED', 'SKIPPED'] as const;
export type WhatsAppStatus = (typeof WHATSAPP_STATUSES)[number];

export interface IEnquiry extends Document {
  type: EnquiryType;
  referenceNo: string;
  name: string;
  phone: string;
  email?: string;
  // Quick Book: the services picked (one or more).
  services: string[];
  servicePath?: string;
  // Contact form: the service / topic chosen.
  subject?: string;
  message?: string;
  // Website page the form was sent from.
  page?: string;
  status: EnquiryStatus;
  statusUpdatedBy?: ActorSnapshot;
  statusUpdatedAt?: Date;
  // "We got your request" WhatsApp to the customer.
  whatsapp?: { status: WhatsAppStatus; at: Date; error?: string };
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    type: { type: String, enum: ENQUIRY_TYPES, required: true },
    referenceNo: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    services: { type: [String], default: [] },
    servicePath: { type: String, trim: true, maxlength: 300 },
    subject: { type: String, trim: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 2000 },
    page: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'PENDING' },
    statusUpdatedBy: { type: actorSnapshotSchema },
    statusUpdatedAt: { type: Date },
    whatsapp: {
      type: new Schema(
        {
          status: { type: String, enum: WHATSAPP_STATUSES, required: true },
          at: { type: Date, required: true },
          error: { type: String, maxlength: 500 },
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

enquirySchema.index({ type: 1, createdAt: -1 });

export const EnquiryModel = model<IEnquiry>('Enquiry', enquirySchema, 'enquiries');

// Running number per enquiry type, for the reference shown to the visitor.
const enquiryCounterSchema = new Schema<{ _id: string; seq: number }>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
export const EnquiryCounterModel = model('EnquiryCounter', enquiryCounterSchema, 'enquiryCounters');
