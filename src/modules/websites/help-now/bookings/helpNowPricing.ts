import { ValidationError } from '../../../../lib/errors';

// Help Now service pages (helpnow.citycalls.in/services/<slug>) and their
// default hourly rate per helper, in rupees. Admin → Help Now → Popular
// Services can set each rate (helpNowRates.ts); bookings are priced with that,
// and the website reads the same rates from /bookings/rates.
export const HELP_NOW_SERVICES = {
  'house-cleaning': { name: 'House Cleaning', ratePerHour: 179 },
  'dish-washing': { name: 'Dish Washing', ratePerHour: 159 },
  'kitchen-assistance': { name: 'Kitchen Assistance', ratePerHour: 199 },
  'bathroom-cleaning': { name: 'Bathroom Cleaning', ratePerHour: 189 },
  'laundry-ironing': { name: 'Laundry & Ironing', ratePerHour: 169 },
  'dusting-wiping': { name: 'Dusting & Wiping', ratePerHour: 149 },
  'everyday-home-help': { name: 'Everyday Home Help', ratePerHour: 169 },
} as const;

export type HelpNowServiceSlug = keyof typeof HELP_NOW_SERVICES;
export const HELP_NOW_SERVICE_SLUGS = Object.keys(HELP_NOW_SERVICES) as [HelpNowServiceSlug, ...HelpNowServiceSlug[]];

export const HELP_NOW_LIMITS = { minHours: 1, maxHours: 16, minHelpers: 1, maxHelpers: 4 } as const;
// Bounds for an admin-set hourly rate, in rupees.
export const HELP_NOW_RATE_LIMITS = { min: 49, max: 5000 } as const;
export type HelpNowRates = Record<HelpNowServiceSlug, number>;

// Optional buffer for heavy grease / dirt, charged once per booking (rupees).
export const HELP_NOW_EXTRA_TIME = {
  NONE: { label: 'None', charge: 0 },
  MIN_30: { label: '+30 mins extra', charge: 79 },
  HOUR_1: { label: '+1 hour extra', charge: 149 },
} as const;
export type HelpNowExtraTime = keyof typeof HELP_NOW_EXTRA_TIME;
export const HELP_NOW_EXTRA_TIME_OPTIONS = Object.keys(HELP_NOW_EXTRA_TIME) as [HelpNowExtraTime, ...HelpNowExtraTime[]];

interface HelpNowCoupon {
  code: string;
  label: string;
  type: 'PERCENT' | 'FLAT';
  // Percent off, or rupees off for FLAT.
  value: number;
  // Largest discount a PERCENT coupon can give, in rupees.
  maxDiscount?: number;
  // Booking value (before discount) the coupon needs, in rupees.
  minSubtotal: number;
  // Only these services; left out = every service.
  services?: HelpNowServiceSlug[];
}

// Coupons accepted on Help Now bookings, shown on the website's pricing
// section (GET .../bookings/coupons). Codes are matched case-insensitively.
// The per-service ones are starter offers — change the amounts freely.
export const HELP_NOW_COUPONS: HelpNowCoupon[] = [
  { code: 'HELPNOW10', label: '10% off (up to ₹150)', type: 'PERCENT', value: 10, maxDiscount: 150, minSubtotal: 0 },
  { code: 'WELCOME50', label: '₹50 off on bookings of ₹300 or more', type: 'FLAT', value: 50, minSubtotal: 300 },
  { code: 'CLEAN15', label: '15% off House Cleaning (up to ₹120)', type: 'PERCENT', value: 15, maxDiscount: 120, minSubtotal: 0, services: ['house-cleaning'] },
  { code: 'DISH15', label: '15% off Dish Washing (up to ₹100)', type: 'PERCENT', value: 15, maxDiscount: 100, minSubtotal: 0, services: ['dish-washing'] },
  { code: 'KITCHEN15', label: '15% off Kitchen Assistance (up to ₹120)', type: 'PERCENT', value: 15, maxDiscount: 120, minSubtotal: 0, services: ['kitchen-assistance'] },
  { code: 'BATH15', label: '15% off Bathroom Cleaning (up to ₹120)', type: 'PERCENT', value: 15, maxDiscount: 120, minSubtotal: 0, services: ['bathroom-cleaning'] },
  { code: 'LAUNDRY15', label: '15% off Laundry & Ironing (up to ₹100)', type: 'PERCENT', value: 15, maxDiscount: 100, minSubtotal: 0, services: ['laundry-ironing'] },
  { code: 'DUST15', label: '15% off Dusting & Wiping (up to ₹100)', type: 'PERCENT', value: 15, maxDiscount: 100, minSubtotal: 0, services: ['dusting-wiping'] },
  { code: 'HOMEHELP15', label: '15% off Everyday Home Help (up to ₹120)', type: 'PERCENT', value: 15, maxDiscount: 120, minSubtotal: 0, services: ['everyday-home-help'] },
];

// What the website lists (everything except internal fields).
export function publicHelpNowCoupons() {
  return HELP_NOW_COUPONS.map(({ code, label, type, value, maxDiscount, minSubtotal, services }) => ({
    code, label, type, value, maxDiscount: maxDiscount ?? null, minSubtotal, services: services ?? null,
  }));
}

export interface HelpNowQuote {
  serviceSlug: HelpNowServiceSlug;
  serviceName: string;
  ratePerHour: number;
  hours: number;
  helpers: number;
  extraTime: HelpNowExtraTime;
  extraTimeCharge: number;
  subtotal: number;
  discount: number;
  total: number;
  coupon: { code: string; label: string } | null;
}

export function quoteHelpNowBooking(input: {
  serviceSlug: HelpNowServiceSlug;
  hours: number;
  helpers: number;
  extraTime?: HelpNowExtraTime;
  couponCode?: string;
}, rates?: Partial<HelpNowRates>): HelpNowQuote {
  const service = HELP_NOW_SERVICES[input.serviceSlug];
  if (!service) {
    throw new ValidationError([{ field: 'serviceSlug', code: 'INVALID', message: 'Unknown Help Now service' }]);
  }

  const extraTime = input.extraTime ?? 'NONE';
  const extraTimeCharge = HELP_NOW_EXTRA_TIME[extraTime].charge;
  // The admin's rate when one is set, else the default.
  const ratePerHour = rates?.[input.serviceSlug] ?? service.ratePerHour;
  const subtotal = ratePerHour * input.hours * input.helpers + extraTimeCharge;
  const code = input.couponCode?.trim().toUpperCase();
  let discount = 0;
  let coupon: HelpNowQuote['coupon'] = null;

  if (code) {
    const match = HELP_NOW_COUPONS.find((c) => c.code === code);
    if (!match) {
      throw new ValidationError([{ field: 'couponCode', code: 'INVALID_COUPON', message: 'This coupon code is not valid' }]);
    }
    if (match.services && !match.services.includes(input.serviceSlug)) {
      throw new ValidationError([{ field: 'couponCode', code: 'COUPON_NOT_APPLICABLE', message: `${match.code} is not valid for ${service.name}` }]);
    }
    if (subtotal < match.minSubtotal) {
      throw new ValidationError([{
        field: 'couponCode',
        code: 'COUPON_NOT_APPLICABLE',
        message: `Add ₹${match.minSubtotal - subtotal} more to use ${match.code}`,
      }]);
    }
    discount = match.type === 'PERCENT'
      ? Math.min(Math.round((subtotal * match.value) / 100), match.maxDiscount ?? Infinity)
      : match.value;
    // Never more than the booking itself; Razorpay needs at least ₹1 to charge.
    discount = Math.min(discount, subtotal - 1);
    coupon = { code: match.code, label: match.label };
  }

  return {
    serviceSlug: input.serviceSlug,
    serviceName: service.name,
    ratePerHour,
    hours: input.hours,
    helpers: input.helpers,
    extraTime,
    extraTimeCharge,
    subtotal,
    discount,
    total: subtotal - discount,
    coupon,
  };
}
