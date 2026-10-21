import {
  HELP_NOW_QUICK_BOOKING_NOT_SURE,
  publicHelpNowQuickBookingSchema,
  updateHelpNowQuickBookingStatusSchema,
} from './helpNowQuickBooking.validation';

const valid = { name: 'Asha Verma', phone: '9876543210', services: ['Dish Washing'], page: 'Help Now /' };

describe('Help Now quick booking validation', () => {
  it('accepts Help Now services, including "not sure"', () => {
    expect(publicHelpNowQuickBookingSchema.safeParse(valid).success).toBe(true);
    expect(publicHelpNowQuickBookingSchema.safeParse({ ...valid, services: ['House Cleaning', HELP_NOW_QUICK_BOOKING_NOT_SURE] }).success).toBe(true);
  });

  it('drops repeated services', () => {
    const parsed = publicHelpNowQuickBookingSchema.parse({ ...valid, services: ['Dish Washing', 'Dish Washing'] });
    expect(parsed.services).toEqual(['Dish Washing']);
  });

  it('rejects City Calls services, no service and bad numbers', () => {
    expect(publicHelpNowQuickBookingSchema.safeParse({ ...valid, services: ['AC Service'] }).success).toBe(false);
    expect(publicHelpNowQuickBookingSchema.safeParse({ ...valid, services: [] }).success).toBe(false);
    expect(publicHelpNowQuickBookingSchema.safeParse({ ...valid, phone: '1234567890' }).success).toBe(false);
  });

  it('rejects unknown fields and statuses', () => {
    expect(publicHelpNowQuickBookingSchema.safeParse({ ...valid, status: 'RESOLVED' }).success).toBe(false);
    expect(updateHelpNowQuickBookingStatusSchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});
