import { AppError, ConflictError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { createRazorpayOrder, razorpayKeyId, verifyRazorpaySignature } from '../../../../lib/razorpayAdapter';
import { createHelpNowRegistration } from '../../../registrations/registrations.service';
import { isPhoneVerified } from './helpNowOtp';
import { HelpNowPaymentModel } from './helpNowPayment.model';
import { HELP_NOW_EXTRA_TIME, HelpNowQuote, quoteHelpNowBooking } from './helpNowPricing';
import { CreateHelpNowBookingInput } from './helpNowBookings.validation';

export function getHelpNowQuote(input: Parameters<typeof quoteHelpNowBooking>[0]) {
  return quoteHelpNowBooking(input);
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// The booking as stored with its payment order — without the one-time phone
// verification token, which has done its job by then.
type StoredBooking = Omit<CreateHelpNowBookingInput, 'phoneVerificationToken'>;

// The booking as an admin registration: tasks become its issues, and the
// plan and payment go in extra details so the team sees what was agreed.
function toRegistration(booking: StoredBooking, quote: HelpNowQuote, paymentId?: string) {
  const paidOnline = Boolean(paymentId);
  const extraDetails = [
    ...(booking.propertyType ? [{ label: 'Home size', value: booking.propertyType }] : []),
    { label: 'Plan', value: `${plural(quote.helpers, 'helper')} × ${plural(quote.hours, 'hour')}` },
    ...(quote.extraTimeCharge ? [{ label: 'Extra time', value: `${HELP_NOW_EXTRA_TIME[quote.extraTime].label} (₹${quote.extraTimeCharge})` }] : []),
    { label: 'Rate', value: `₹${quote.ratePerHour}/hour per helper` },
    { label: 'Booking value', value: `₹${quote.subtotal}` },
    ...(quote.coupon ? [{ label: 'Coupon discount', value: `₹${quote.discount} off (${quote.coupon.code})` }] : []),
    { label: 'Amount', value: paidOnline ? `₹${quote.total} paid online` : `₹${quote.total} to collect after service` },
    ...(paymentId ? [{ label: 'Razorpay payment', value: paymentId }] : []),
  ];

  return {
    fullName: booking.fullName,
    email: booking.email,
    phone: booking.phone,
    altPhone: booking.altPhone || undefined,
    address: booking.address,
    pincode: booking.pincode,
    city: booking.city,
    state: booking.state,
    instructions: booking.instructions,
    language: booking.language,
    heardFrom: booking.heardFrom,
    serviceName: quote.serviceName,
    issues: booking.tasks,
    issueDescription: `${quote.serviceName}: ${plural(quote.helpers, 'helper')} for ${plural(quote.hours, 'hour')} — ${booking.tasks.join(', ')}`.slice(0, 500),
    // Midnight India time on the chosen day.
    preferredDate: new Date(`${booking.preferredDate}T00:00:00+05:30`),
    timeSlot: booking.timeSlot,
    couponCode: quote.coupon?.code,
    extraDetails,
  };
}

export async function createHelpNowBooking(input: CreateHelpNowBookingInput) {
  const { phoneVerificationToken, ...booking } = input;
  if (!isPhoneVerified(booking.phone, phoneVerificationToken)) {
    throw new ValidationError([{ field: 'phone', code: 'PHONE_NOT_VERIFIED', message: 'Please verify your phone number with the OTP.' }]);
  }

  // Priced again here — the website's numbers are only ever a preview.
  const quote = quoteHelpNowBooking(booking);

  if (booking.paymentMode === 'AFTER_SERVICE') {
    const registration = await createHelpNowRegistration(toRegistration(booking, quote));
    return { paymentRequired: false as const, quote, booking: registration };
  }

  const order = await createRazorpayOrder({
    amountPaise: quote.total * 100,
    receipt: `helpnow_${Date.now().toString(36)}`,
    notes: { service: quote.serviceName, phone: booking.phone },
  });
  await HelpNowPaymentModel.create({
    razorpayOrderId: order.id,
    amountPaise: order.amount,
    quote,
    booking,
  });

  return {
    paymentRequired: true as const,
    quote,
    // Everything Razorpay Checkout needs on the website.
    checkout: {
      keyId: razorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      description: `${quote.serviceName} · ${plural(quote.helpers, 'helper')} × ${plural(quote.hours, 'hour')}`,
      prefill: { name: booking.fullName, email: booking.email, contact: booking.phone },
    },
  };
}

export async function confirmHelpNowPayment(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  if (!verifyRazorpaySignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) {
    throw new AppError(400, 'We could not verify this payment. If money was deducted, please call us.', [
      { field: 'razorpaySignature', code: 'PAYMENT_VERIFICATION_FAILED', message: 'Payment signature mismatch' },
    ]);
  }

  // Claim the order atomically, so a double submit makes one booking.
  const payment = await HelpNowPaymentModel.findOneAndUpdate(
    { razorpayOrderId: input.razorpayOrderId, status: 'CREATED' },
    { $set: { status: 'PAID', razorpayPaymentId: input.razorpayPaymentId, paidAt: new Date() } },
    { new: true }
  );

  if (!payment) {
    const existing = await HelpNowPaymentModel.findOne({ razorpayOrderId: input.razorpayOrderId }).lean();
    if (!existing) throw new NotFoundError('Payment order not found');
    if (existing.registrationNo) {
      return { registrationNo: existing.registrationNo, serviceName: existing.quote.serviceName, total: existing.quote.total };
    }
    throw new ConflictError('Your payment is being confirmed. Please wait a moment.', 'PAYMENT_IN_PROGRESS');
  }

  try {
    const registration = await createHelpNowRegistration(
      toRegistration(payment.booking, payment.quote, input.razorpayPaymentId)
    );
    await HelpNowPaymentModel.updateOne({ _id: payment._id }, { $set: { registrationNo: registration.registrationNo } });
    return { ...registration, total: payment.quote.total };
  } catch (error) {
    // Hand the order back so the website can retry confirming it.
    await HelpNowPaymentModel.updateOne({ _id: payment._id }, { $set: { status: 'CREATED' } }).catch(() => undefined);
    throw error;
  }
}
