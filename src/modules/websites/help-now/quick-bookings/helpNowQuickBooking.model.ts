import { Document, Schema, model } from 'mongoose';
import { ActorSnapshot, actorSnapshotSchema } from '../../../../lib/actor';

// Help Now's "Book Now" quick form (helpnow.citycalls.in navbar). Kept apart
// from City Calls' Quick Book enquiries — own collection, own HQ- numbers —
// and worked through in Admin → Enquiry Section → Help Now Quick Booking as
// Pending → Contacted → Resolved.
export const HELP_NOW_QUICK_BOOKING_STATUSES = ['PENDING', 'CONTACTED', 'RESOLVED'] as const;
export type HelpNowQuickBookingStatus = (typeof HELP_NOW_QUICK_BOOKING_STATUSES)[number];

// SKIPPED = WhatsApp sending is switched off (AISENSY_ENABLED=false).
export const WHATSAPP_STATUSES = ['SENT', 'FAILED', 'SKIPPED'] as const;

export interface IHelpNowQuickBooking extends Document {
  referenceNo: string;
  name: string;
  phone: string;
  services: string[];
  message?: string;
  // Help Now page the form was sent from.
  page?: string;
  status: HelpNowQuickBookingStatus;
  statusUpdatedBy?: ActorSnapshot;
  statusUpdatedAt?: Date;
  // "We got your request" WhatsApp to the customer.
  whatsapp?: { status: (typeof WHATSAPP_STATUSES)[number]; at: Date; error?: string };
  createdAt: Date;
  updatedAt: Date;
}

const helpNowQuickBookingSchema = new Schema<IHelpNowQuickBooking>(
  {
    referenceNo: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 15 },
    services: { type: [String], default: [] },
    message: { type: String, trim: true, maxlength: 500 },
    page: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: HELP_NOW_QUICK_BOOKING_STATUSES, default: 'PENDING' },
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

helpNowQuickBookingSchema.index({ createdAt: -1 });
helpNowQuickBookingSchema.index({ status: 1 });
helpNowQuickBookingSchema.index({ phone: 1 });

export const HelpNowQuickBookingModel = model<IHelpNowQuickBooking>(
  'HelpNowQuickBooking',
  helpNowQuickBookingSchema,
  'helpNowQuickBookings'
);

// Running number for the HQ-000001 references.
const helpNowCounterSchema = new Schema<{ _id: string; seq: number }>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
export const HelpNowCounterModel = model('HelpNowCounter', helpNowCounterSchema, 'helpNowCounters');
