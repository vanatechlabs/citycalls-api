import { publicContactEnquirySchema, publicQuickBookingSchema } from './enquiries.validation';
import { contactEnquiryWhatsAppParams, quickBookingWhatsAppParams } from './enquiries.service';

const valid = { name: 'Rahul Sharma', phone: '9876543210', serviceName: 'AC Service' };

describe('Website quick booking validation', () => {
  it('accepts name, phone and service, with an optional message', () => {
    expect(publicQuickBookingSchema.safeParse(valid).success).toBe(true);
    expect(publicQuickBookingSchema.safeParse({ ...valid, message: 'AC not cooling', page: '/' }).success).toBe(true);
  });

  it('needs a valid Indian mobile number', () => {
    expect(publicQuickBookingSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false);
    expect(publicQuickBookingSchema.safeParse({ ...valid, phone: '1234567890' }).success).toBe(false);
  });

  it('needs a name and a service, and rejects unknown fields', () => {
    expect(publicQuickBookingSchema.safeParse({ ...valid, name: ' ' }).success).toBe(false);
    expect(publicQuickBookingSchema.safeParse({ ...valid, serviceName: '' }).success).toBe(false);
    expect(publicQuickBookingSchema.safeParse({ ...valid, ownerId: 'x' }).success).toBe(false);
  });
});

describe('Website contact enquiry validation', () => {
  const contact = { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210', message: 'Need AC service' };

  it('accepts name, email, phone and message, with an optional subject', () => {
    expect(publicContactEnquirySchema.safeParse(contact).success).toBe(true);
    expect(publicContactEnquirySchema.safeParse({ ...contact, subject: 'AC Service' }).success).toBe(true);
  });

  it('needs a valid email, mobile and a message, and rejects unknown fields', () => {
    expect(publicContactEnquirySchema.safeParse({ ...contact, email: 'nope' }).success).toBe(false);
    expect(publicContactEnquirySchema.safeParse({ ...contact, phone: '12345' }).success).toBe(false);
    expect(publicContactEnquirySchema.safeParse({ ...contact, message: '' }).success).toBe(false);
    expect(publicContactEnquirySchema.safeParse({ ...contact, status: 'RESOLVED' }).success).toBe(false);
  });
});

describe('Quick Book WhatsApp template params', () => {
  it('sends first name, services and reference no. in template order', () => {
    expect(quickBookingWhatsAppParams({ name: 'Vansh Chaudhary', services: ['AC Service', 'RO Service'], referenceNo: 'QB-000002' }))
      .toEqual(['Vansh', 'AC Service, RO Service', 'QB-000002']);
  });

  it('never sends an empty value (WhatsApp rejects blank params)', () => {
    expect(quickBookingWhatsAppParams({ name: '  ', services: [], referenceNo: 'QB-000003' })).toEqual(['there', 'your service', 'QB-000003']);
  });
});

describe('Contact enquiry WhatsApp template params', () => {
  it('sends first name, subject and reference no. in template order', () => {
    expect(contactEnquiryWhatsAppParams({ name: 'Vansh Chaudhary', subject: 'Television Repair Services', referenceNo: 'CE-000003' }))
      .toEqual(['Vansh', 'Television Repair Services', 'CE-000003']);
  });

  it('falls back when no service was picked', () => {
    expect(contactEnquiryWhatsAppParams({ name: 'Vansh', referenceNo: 'CE-000004' })).toEqual(['Vansh', 'your request', 'CE-000004']);
  });
});
