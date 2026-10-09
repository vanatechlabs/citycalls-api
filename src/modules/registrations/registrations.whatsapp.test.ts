import { serviceBookingWhatsAppParams } from './registrations.service';

describe('Service booking WhatsApp params ("CityCalls Services Received")', () => {
  const base = { fullName: 'Rahul Kumar Sharma', serviceName: 'Refrigerator Service', registrationNo: 'CC2026101201' };

  it('sends first name, service, problems, slot and booking ID in template order', () => {
    expect(
      serviceBookingWhatsAppParams({
        ...base,
        issues: ['Not cooling', 'Gas leakage'],
        preferredDate: new Date('2026-10-12T00:00:00.000Z'),
        timeSlot: '10:00 AM - 12:00 PM',
      })
    ).toEqual(['Rahul', 'Refrigerator Service', 'Not cooling, Gas leakage', '12 Oct 2026, 10:00 AM - 12:00 PM', 'CC2026101201']);
  });

  it('falls back when the customer skipped the problem or the slot', () => {
    const params = serviceBookingWhatsAppParams({ ...base, issues: [], issueDescription: '' });
    expect(params[2]).toBe('General service');
    expect(params[3]).toBe('To be confirmed by our team');
    expect(serviceBookingWhatsAppParams({ ...base, issues: [], issueDescription: 'Door\nnot closing' })[2]).toBe('Door not closing');
  });

  it('keeps values on one line and not too long', () => {
    const params = serviceBookingWhatsAppParams({ ...base, issues: ['x'.repeat(400)] });
    expect(params[2].length).toBeLessThanOrEqual(200);
    expect(params.every((p) => !p.includes('\n'))).toBe(true);
  });
});
