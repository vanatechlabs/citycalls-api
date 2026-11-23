import { AppError, ConflictError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { createRazorpayOrder, razorpayKeyId, verifyRazorpaySignature } from '../../../../lib/razorpayAdapter';
import { createHelpNowRegistration, setHelpNowPayment, updateHelpNowRegistration } from '../../../registrations/registrations.service';
import type { RegistrationPayment } from '../../../registrations/registration.model';
import { isPhoneVerified } from './helpNowOtp';
import { HelpNowPaymentModel } from './helpNowPayment.model';
import { HELP_NOW_EXTRA_TIME, HelpNowQuote, quoteHelpNowBooking } from './helpNowPricing';
import { getHelpNowRates } from './helpNowRates';
import { CreateHelpNowBookingInput } from './helpNowBookings.validation';

export async function getHelpNowQuote(input: Parameters<typeof quoteHelpNowBooking>[0]) {
  return quoteHelpNowBooking(input, await getHelpNowRates());
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// The booking as stored with its payment order — without the one-time phone
// verification token, which has done its job by then.
type StoredBooking = Omit<CreateHelpNowBookingInput, 'phoneVerificationToken'>;

// How the booking is paid, as stored on the call (shown in its Payment section).
function paymentFor(quote: HelpNowQuote, payment: Pick<RegistrationPayment, 'mode' | 'status'> & Partial<RegistrationPayment>): RegistrationPayment {
  return {
    subtotal: quote.subtotal,
    discount: quote.discount,
    amount: quote.total,
    couponCode: quote.coupon?.code,
    ...(payment.mode === 'ONLINE' && { gateway: 'RAZORPAY' as const }),
    updatedAt: new Date(),
    ...payment,
  };
}

// The booking as an admin call: tasks become its issues, the plan goes in
// extra details, and the payment in its own section.
function toRegistration(booking: StoredBooking, quote: HelpNowQuote, payment: RegistrationPayment) {
  const extraDetails = [
    ...(booking.propertyType ? [{ label: 'Home size', value: booking.propertyType }] : []),
    { label: 'Plan', value: `${plural(quote.helpers, 'helper')} × ${plural(quote.hours, 'hour')}` },
    ...(quote.extraTimeCharge ? [{ label: 'Extra time', value: `${HELP_NOW_EXTRA_TIME[quote.extraTime].label} (₹${quote.extraTimeCharge})` }] : []),
    { label: 'Rate', value: `₹${quote.ratePerHour}/hour per helper` },
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
    payment,
  };
}

// An unpaid online booking from the same customer for the same service and
// slot, made in the last day: a retry updates that call instead of adding one.
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;
async function retriedCallId(booking: StoredBooking, quote: HelpNowQuote) {
  const earlier = await HelpNowPaymentModel.findOne({
    status: { $in: ['CREATED', 'FAILED'] },
    registrationId: { $exists: true },
    'booking.phone': booking.phone,
    'booking.preferredDate': booking.preferredDate,
    'booking.timeSlot': booking.timeSlot,
    'quote.serviceSlug': quote.serviceSlug,
    createdAt: { $gte: new Date(Date.now() - RETRY_WINDOW_MS) },
  }).sort({ createdAt: -1 }).lean();
  return earlier?.registrationId;
}

export async function createHelpNowBooking(input: CreateHelpNowBookingInput) {
  const { phoneVerificationToken, ...booking } = input;
  if (!isPhoneVerified(booking.phone, phoneVerificationToken)) {
    throw new ValidationError([{ field: 'phone', code: 'PHONE_NOT_VERIFIED', message: 'Please verify your phone number with the OTP.' }]);
  }

  // Priced again here — the website's numbers are only ever a preview.
  const quote = quoteHelpNowBooking(booking, await getHelpNowRates());

  if (booking.paymentMode === 'AFTER_SERVICE') {
    const call = await createHelpNowRegistration(
      toRegistration(booking, quote, paymentFor(quote, { mode: 'AFTER_SERVICE', status: 'TO_COLLECT' }))
    );
    // Only what the thank-you screen needs.
    return { paymentRequired: false as const, quote, booking: { registrationNo: call.registrationNo, serviceName: call.serviceName } };
  }

  const order = await createRazorpayOrder({
    amountPaise: quote.total * 100,
    receipt: `helpnow_${Date.now().toString(36)}`,
    notes: { service: quote.serviceName, phone: booking.phone },
  });

  // The call is made now, payment "Not completed", so an abandoned checkout
  // is still a lead. No WhatsApp until it's paid.
  const data = toRegistration(booking, quote, paymentFor(quote, { mode: 'ONLINE', status: 'PENDING', orderId: order.id }));
  const retryOf = await retriedCallId(booking, quote);
  const call = retryOf
    ? await updateHelpNowRegistration(retryOf, data).catch(() => createHelpNowRegistration(data, { notify: false }))
    : await createHelpNowRegistration(data, { notify: false });

  await HelpNowPaymentModel.create({
    razorpayOrderId: order.id,
    amountPaise: order.amount,
    quote,
    booking,
    registrationId: call.id,
    registrationNo: call.registrationNo,
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

  // Claim the order atomically, so a double submit confirms it once. A
  // FAILED attempt can still succeed (Checkout lets the customer retry).
  const paidAt = new Date();
  const payment = await HelpNowPaymentModel.findOneAndUpdate(
    { razorpayOrderId: input.razorpayOrderId, status: { $in: ['CREATED', 'FAILED'] } },
    { $set: { status: 'PAID', razorpayPaymentId: input.razorpayPaymentId, paidAt }, $unset: { failureReason: '' } },
    { new: false }
  );

  if (!payment) {
    const existing = await HelpNowPaymentModel.findOne({ razorpayOrderId: input.razorpayOrderId }).lean();
    if (!existing) throw new NotFoundError('Payment order not found');
    if (existing.status === 'PAID' && existing.registrationNo) {
      return { registrationNo: existing.registrationNo, serviceName: existing.quote.serviceName, total: existing.quote.total };
    }
    throw new ConflictError('Your payment is being confirmed. Please wait a moment.', 'PAYMENT_IN_PROGRESS');
  }

  try {
    const paid = { status: 'PAID' as const, paymentId: input.razorpayPaymentId, paidAt };
    const call = payment.registrationId
      ? await setHelpNowPayment(payment.registrationId, paid)
      // Orders made before calls were created at order time.
      : await createHelpNowRegistration(
        toRegistration(payment.booking, payment.quote, paymentFor(payment.quote, { mode: 'ONLINE', orderId: payment.razorpayOrderId, ...paid }))
      );
    await HelpNowPaymentModel.updateOne({ _id: payment._id }, { $set: { registrationId: call.id, registrationNo: call.registrationNo } });
    return { registrationNo: call.registrationNo, serviceName: call.serviceName, total: payment.quote.total };
  } catch (error) {
    // Hand the order back so the website can retry confirming it.
    await HelpNowPaymentModel.updateOne({ _id: payment._id }, { $set: { status: payment.status } }).catch(() => undefined);
    throw error;
  }
}

// Checkout reported a failed payment: the call stays a lead, marked FAILED
// with the reason, unless it has already been paid.
export async function markHelpNowPaymentFailed(input: { razorpayOrderId: string; reason?: string }) {
  const reason = (input.reason?.trim() || 'Payment failed').slice(0, 300);
  const payment = await HelpNowPaymentModel.findOneAndUpdate(
    { razorpayOrderId: input.razorpayOrderId, status: { $in: ['CREATED', 'FAILED'] } },
    { $set: { status: 'FAILED', failureReason: reason } },
    { new: true }
  );
  if (payment?.registrationId) {
    await setHelpNowPayment(payment.registrationId, { status: 'FAILED', failureReason: reason }).catch(() => undefined);
  }
  return { recorded: Boolean(payment) };
}
