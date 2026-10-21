import crypto from 'crypto';
import { verifyRazorpaySignature } from '../../../../lib/razorpayAdapter';
import jwt from 'jsonwebtoken';
import { env } from '../../../../config/env';
import { isPhoneVerified } from './helpNowOtp';
import { quoteHelpNowBooking } from './helpNowPricing';
import { createHelpNowBookingSchema, helpNowQuoteSchema, istDateString, verifyHelpNowPaymentSchema } from './helpNowBookings.validation';

const TEST_SECRET = 'test_secret_for_signature';

// jest.mock is hoisted above the imports, so the adapter sees this secret.
jest.mock('../../../../config/env', () => {
  const actual = jest.requireActual('../../../../config/env');
  return { ...actual, env: { ...actual.env, razorpay: { keyId: 'rzp_test_dummy', keySecret: 'test_secret_for_signature' } } };
});

const validBooking = {
  serviceSlug: 'dish-washing',
  hours: 2,
  helpers: 1,
  fullName: 'Asha Verma',
  email: 'asha@example.com',
  phone: '9876543210',
  address: 'B-12, Shipra Suncity',
  pincode: '201014',
  city: 'Ghaziabad',
  state: 'Uttar Pradesh',
  tasks: ['Kitchen Utensil Washing'],
  preferredDate: istDateString(new Date()),
  timeSlot: '09:00 AM - 11:00 AM',
  paymentMode: 'ONLINE',
  phoneVerificationToken: 'token-from-otp-verify',
};

describe('Help Now pricing', () => {
  it('charges rate × hours × helpers without a coupon', () => {
    const quote = quoteHelpNowBooking({ serviceSlug: 'dish-washing', hours: 3, helpers: 2 });
    expect(quote.subtotal).toBe(159 * 3 * 2);
    expect(quote.discount).toBe(0);
    expect(quote.total).toBe(quote.subtotal);
    expect(quote.coupon).toBeNull();
  });

  it('applies a percent coupon case-insensitively and caps it', () => {
    const small = quoteHelpNowBooking({ serviceSlug: 'dusting-wiping', hours: 2, helpers: 1, couponCode: 'helpnow10' });
    expect(small.discount).toBe(30); // 10% of 298, rounded
    const large = quoteHelpNowBooking({ serviceSlug: 'kitchen-assistance', hours: 8, helpers: 4, couponCode: 'HELPNOW10' });
    expect(large.discount).toBe(150);
    expect(large.total).toBe(large.subtotal - 150);
  });

  it('applies a flat coupon only above its minimum', () => {
    const quote = quoteHelpNowBooking({ serviceSlug: 'house-cleaning', hours: 2, helpers: 1, couponCode: 'WELCOME50' });
    expect(quote.discount).toBe(50);
    expect(() => quoteHelpNowBooking({ serviceSlug: 'dish-washing', hours: 1, helpers: 1, couponCode: 'WELCOME50' }))
      .toThrow('Validation failed');
  });

  it('adds the extra-time charge once and allows up to 16 hours', () => {
    const quote = quoteHelpNowBooking({ serviceSlug: 'dish-washing', hours: 16, helpers: 2, extraTime: 'MIN_30' });
    expect(quote.extraTimeCharge).toBe(79);
    expect(quote.subtotal).toBe(159 * 16 * 2 + 79);
  });

  it('limits a service coupon to its service', () => {
    expect(quoteHelpNowBooking({ serviceSlug: 'dish-washing', hours: 2, helpers: 1, couponCode: 'DISH15' }).discount).toBe(48);
    expect(() => quoteHelpNowBooking({ serviceSlug: 'house-cleaning', hours: 2, helpers: 1, couponCode: 'DISH15' })).toThrow('Validation failed');
  });

  it('rejects an unknown coupon', () => {
    expect(() => quoteHelpNowBooking({ serviceSlug: 'dish-washing', hours: 2, helpers: 1, couponCode: 'FREEBIE' }))
      .toThrow('Validation failed');
  });
});

describe('Help Now booking validation', () => {
  it('accepts a complete booking', () => {
    expect(createHelpNowBookingSchema.safeParse(validBooking).success).toBe(true);
  });

  it('rejects unknown services and out-of-range plans', () => {
    expect(helpNowQuoteSchema.safeParse({ serviceSlug: 'ac-service', hours: 2, helpers: 1 }).success).toBe(false);
    expect(helpNowQuoteSchema.safeParse({ serviceSlug: 'dish-washing', hours: 17, helpers: 1 }).success).toBe(false);
    expect(helpNowQuoteSchema.safeParse({ serviceSlug: 'dish-washing', hours: 2, helpers: 5 }).success).toBe(false);
  });

  it('rejects past dates and bookings without tasks', () => {
    expect(createHelpNowBookingSchema.safeParse({ ...validBooking, preferredDate: '2020-01-01' }).success).toBe(false);
    expect(createHelpNowBookingSchema.safeParse({ ...validBooking, tasks: [] }).success).toBe(false);
  });

  it('needs a phone verification token', () => {
    expect(createHelpNowBookingSchema.safeParse({ ...validBooking, phoneVerificationToken: undefined }).success).toBe(false);
  });

  it('does not accept a client-sent price', () => {
    expect(createHelpNowBookingSchema.safeParse({ ...validBooking, total: 1 }).success).toBe(false);
  });
});

describe('Razorpay signature', () => {
  const orderId = 'order_TEST1234567';
  const paymentId = 'pay_TEST7654321';
  const signature = crypto.createHmac('sha256', TEST_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

  it('accepts the signature Checkout returns', () => {
    expect(verifyHelpNowPaymentSchema.safeParse({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature }).success).toBe(true);
    expect(verifyRazorpaySignature(orderId, paymentId, signature)).toBe(true);
  });

  it('rejects a signature for a different payment', () => {
    expect(verifyRazorpaySignature(orderId, 'pay_OTHER0000000', signature)).toBe(false);
    expect(verifyRazorpaySignature(orderId, paymentId, 'abc')).toBe(false);
  });
});

describe('Help Now phone verification token', () => {
  const sign = (payload: object) => jwt.sign(payload, env.jwtAccessSecret, { expiresIn: '1h' });

  it('accepts a token for the same number', () => {
    expect(isPhoneVerified('9876543210', sign({ phone: '9876543210', purpose: 'helpnow-booking-phone' }))).toBe(true);
  });

  it('rejects a token for another number, purpose or a forged one', () => {
    expect(isPhoneVerified('9876543210', sign({ phone: '9999999999', purpose: 'helpnow-booking-phone' }))).toBe(false);
    expect(isPhoneVerified('9876543210', sign({ phone: '9876543210', purpose: 'login' }))).toBe(false);
    expect(isPhoneVerified('9876543210', jwt.sign({ phone: '9876543210', purpose: 'helpnow-booking-phone' }, 'wrong-secret'))).toBe(false);
    expect(isPhoneVerified('9876543210', undefined)).toBe(false);
  });
});
