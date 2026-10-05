import {
  bulkDeleteRegistrationsSchema,
  registrationStatsQuerySchema,
  createRegistrationSchema,
  listRegistrationsQuerySchema,
  publicCreateRegistrationSchema,
  transitionRegistrationSchema,
  updateRegistrationSchema,
} from './registrations.validation';

const validRegistration = {
  fullName: 'Rahul Sharma',
  email: 'rahul@example.com',
  phone: '9876543210',
  address: 'Flat 12, Tower B, Shipra Suncity',
  pincode: '201014',
  city: 'Ghaziabad',
  state: 'Uttar Pradesh',
  serviceName: 'Refrigerator Service',
  issues: ['Not Cooling'],
  issueDescription: 'Not cooling for the last 2 days.',
};

describe('Registration validation', () => {
  it('accepts a complete registration and defaults photos', () => {
    const result = createRegistrationSchema.parse(validRegistration);
    expect(result.photos).toEqual([]);
  });

  it('accepts an empty alternate number', () => {
    expect(createRegistrationSchema.safeParse({ ...validRegistration, altPhone: '' }).success).toBe(true);
  });

  it('rejects a short phone number and a bad pincode', () => {
    expect(createRegistrationSchema.safeParse({ ...validRegistration, phone: '98765' }).success).toBe(false);
    expect(createRegistrationSchema.safeParse({ ...validRegistration, pincode: '2010' }).success).toBe(false);
  });

  it('requires at least one issue', () => {
    expect(createRegistrationSchema.safeParse({ ...validRegistration, issues: [] }).success).toBe(false);
  });

  it('rejects more than 5 photos', () => {
    const photos = Array.from({ length: 6 }, (_, i) => `/uploads/x/${i}.png`);
    expect(createRegistrationSchema.safeParse({ ...validRegistration, photos }).success).toBe(false);
  });

  it('does not reset photos on a partial update', () => {
    const result = updateRegistrationSchema.parse({ city: 'Faridabad' });
    expect(result).toEqual({ city: 'Faridabad' });
  });

  it('does not allow status changes through a plain update', () => {
    expect(updateRegistrationSchema.safeParse({ status: 'CLOSED' }).success).toBe(false);
  });

  it('transition needs a target stage and a note', () => {
    expect(transitionRegistrationSchema.safeParse({ status: 'ACTIVE', note: 'Technician assigned' }).success).toBe(true);
    expect(transitionRegistrationSchema.safeParse({ status: 'ACTIVE', note: '   ' }).success).toBe(false);
    expect(transitionRegistrationSchema.safeParse({ status: 'PENDING', note: 'Customer asked to call back' }).success).toBe(true);
    expect(transitionRegistrationSchema.safeParse({ status: 'REOPENED', note: 'Issue came back' }).success).toBe(true);
    // Nothing moves back to New; unknown statuses are rejected.
    expect(transitionRegistrationSchema.safeParse({ status: 'NEW', note: 'x' }).success).toBe(false);
    expect(transitionRegistrationSchema.safeParse({ status: 'COMPLETED', note: 'x' }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(updateRegistrationSchema.safeParse({}).success).toBe(false);
  });

  it('applies list pagination defaults', () => {
    expect(listRegistrationsQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('accepts date filters only as YYYY-MM-DD', () => {
    expect(listRegistrationsQuerySchema.safeParse({ from: '2026-09-01', to: '2026-09-29' }).success).toBe(true);
    expect(listRegistrationsQuerySchema.safeParse({ from: '29/09/2026' }).success).toBe(false);
  });

  it('stats query has no status or paging', () => {
    expect(registrationStatsQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(false);
    expect(registrationStatsQuerySchema.safeParse({ source: 'ADMIN' }).success).toBe(true);
  });

  it('accepts a website booking by service slug, without service ids or photos', () => {
    const { serviceName, ...rest } = validRegistration;
    const booking = { ...rest, serviceSlug: 'ac-service', serviceName };
    expect(publicCreateRegistrationSchema.safeParse(booking).success).toBe(true);
    expect(publicCreateRegistrationSchema.safeParse({ ...booking, serviceId: '64b7f0c2a1b2c3d4e5f60718' }).success).toBe(false);
    expect(publicCreateRegistrationSchema.safeParse({ ...booking, photos: ['/uploads/x.png'] }).success).toBe(false);
    expect(publicCreateRegistrationSchema.safeParse({ ...booking, serviceSlug: '../admin' }).success).toBe(false);
  });

  it('bulk delete needs valid ids', () => {
    expect(bulkDeleteRegistrationsSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(bulkDeleteRegistrationsSchema.safeParse({ ids: ['not-an-id'] }).success).toBe(false);
    expect(bulkDeleteRegistrationsSchema.safeParse({ ids: ['64b7f0c2a1b2c3d4e5f60718'] }).success).toBe(true);
  });
});
