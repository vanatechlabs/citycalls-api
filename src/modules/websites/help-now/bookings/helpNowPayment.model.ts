import { Document, Schema, model } from 'mongoose';
import type { HelpNowQuote } from './helpNowPricing';
import type { CreateHelpNowBookingInput } from './helpNowBookings.validation';

// One Razorpay order for an online-paid Help Now booking. The booking becomes
// a call in Admin → Help Now Call Section as soon as the order is made
// (payment "Not completed"), so an abandoned checkout is still a lead to call
// back; Checkout's result then marks it PAID or FAILED.
export const HELP_NOW_PAYMENT_STATUSES = ['CREATED', 'PAID', 'FAILED'] as const;
export type HelpNowPaymentStatus = (typeof HELP_NOW_PAYMENT_STATUSES)[number];

export interface IHelpNowPayment extends Document {
  razorpayOrderId: string;
  amountPaise: number;
  status: HelpNowPaymentStatus;
  quote: HelpNowQuote;
  booking: Omit<CreateHelpNowBookingInput, 'phoneVerificationToken'>;
  razorpayPaymentId?: string;
  paidAt?: Date;
  failureReason?: string;
  // The call this order belongs to (orders from before calls were made at
  // order time have none — their call is made when paid).
  registrationId?: string;
  registrationNo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const helpNowPaymentSchema = new Schema<IHelpNowPayment>(
  {
    razorpayOrderId: { type: String, required: true, unique: true },
    amountPaise: { type: Number, required: true, min: 100 },
    status: { type: String, enum: HELP_NOW_PAYMENT_STATUSES, default: 'CREATED' },
    quote: { type: Schema.Types.Mixed, required: true },
    booking: { type: Schema.Types.Mixed, required: true },
    razorpayPaymentId: { type: String, trim: true },
    paidAt: { type: Date },
    failureReason: { type: String, trim: true, maxlength: 300 },
    registrationId: { type: String, trim: true },
    registrationNo: { type: String, trim: true },
  },
  { timestamps: true }
);

export const HelpNowPaymentModel = model<IHelpNowPayment>('HelpNowPayment', helpNowPaymentSchema, 'helpNowPayments');
