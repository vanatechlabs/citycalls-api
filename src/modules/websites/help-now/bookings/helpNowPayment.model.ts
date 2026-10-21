import { Document, Schema, model } from 'mongoose';
import type { HelpNowQuote } from './helpNowPricing';
import type { CreateHelpNowBookingInput } from './helpNowBookings.validation';

// One Razorpay order for an online-paid Help Now booking. The booking is held
// here (as validated when the order was made) until Checkout reports the
// payment; only then does it become a registration, so an abandoned checkout
// never shows up as a booking in admin.
export const HELP_NOW_PAYMENT_STATUSES = ['CREATED', 'PAID'] as const;
export type HelpNowPaymentStatus = (typeof HELP_NOW_PAYMENT_STATUSES)[number];

export interface IHelpNowPayment extends Document {
  razorpayOrderId: string;
  amountPaise: number;
  status: HelpNowPaymentStatus;
  quote: HelpNowQuote;
  booking: Omit<CreateHelpNowBookingInput, 'phoneVerificationToken'>;
  razorpayPaymentId?: string;
  paidAt?: Date;
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
    registrationNo: { type: String, trim: true },
  },
  { timestamps: true }
);

export const HelpNowPaymentModel = model<IHelpNowPayment>('HelpNowPayment', helpNowPaymentSchema, 'helpNowPayments');
