import { createCallEnquirySchema, updateCallEnquirySchema } from './callEnquiry';

const valid = { name: 'Rahul Sharma', phone: '9876543210', serviceName: 'AC Service', source: 'Just Dial' };

describe('Call enquiry validation', () => {
  it('accepts a name, mobile, service and source', () => {
    expect(createCallEnquirySchema.safeParse(valid).success).toBe(true);
    expect(createCallEnquirySchema.safeParse({ ...valid, source: 'Referral', sourceDetail: 'Amit (neighbour)', remarks: 'Call back at 6 PM' }).success).toBe(true);
  });

  it('needs a valid 10-digit mobile number', () => {
    expect(createCallEnquirySchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false);
    expect(createCallEnquirySchema.safeParse({ ...valid, phone: '1234567890' }).success).toBe(false);
  });

  it('only takes the listed sources, and rejects unknown fields', () => {
    expect(createCallEnquirySchema.safeParse({ ...valid, source: 'Newspaper' }).success).toBe(false);
    expect(createCallEnquirySchema.safeParse({ ...valid, status: 'CONVERTED' }).success).toBe(false);
    expect(createCallEnquirySchema.safeParse({ ...valid, serviceId: 'abc' }).success).toBe(false);
  });

  it('takes a typed "Other" service without a navbar link, and can drop the link on update', () => {
    expect(createCallEnquirySchema.safeParse({ ...valid, serviceName: 'Water tank cleaning', serviceCategory: 'Other' }).success).toBe(true);
    expect(updateCallEnquirySchema.parse({ serviceId: null, serviceName: 'Water tank cleaning' })).toEqual({ serviceId: null, serviceName: 'Water tank cleaning' });
  });

  it('takes several services in one enquiry', () => {
    const services = [
      { serviceId: '64b7f0c2a1b2c3d4e5f60718', name: 'AC Service', category: 'Home Appliance' },
      { name: 'Water tank cleaning', category: 'Other' },
    ];
    expect(createCallEnquirySchema.safeParse({ ...valid, serviceName: 'AC Service, Water tank cleaning', services }).success).toBe(true);
    expect(createCallEnquirySchema.safeParse({ ...valid, services: [] }).success).toBe(false);
    expect(createCallEnquirySchema.safeParse({ ...valid, services: [{ name: '' }] }).success).toBe(false);
  });

  it('an update can mark it converted with its registration number', () => {
    expect(updateCallEnquirySchema.parse({ status: 'CONVERTED', registrationNo: 'CC2026101401' })).toEqual({ status: 'CONVERTED', registrationNo: 'CC2026101401' });
    expect(updateCallEnquirySchema.safeParse({}).success).toBe(false);
    expect(updateCallEnquirySchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});
