import { updateSocialLinksSchema } from './socialLinks.validation';

describe('City Calls social links validation', () => {
  it('accepts full URLs and empty values', () => {
    const result = updateSocialLinksSchema.safeParse({
      facebook: 'https://facebook.com/citycalls',
      instagram: '',
      youtube: 'https://youtube.com/@citycalls',
    });
    expect(result.success).toBe(true);
  });

  it('rejects links that are not http(s)', () => {
    expect(updateSocialLinksSchema.safeParse({ facebook: 'facebook.com/citycalls' }).success).toBe(false);
    expect(updateSocialLinksSchema.safeParse({ twitter: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('strips spaces and dashes from phone numbers', () => {
    const parsed = updateSocialLinksSchema.parse({ whatsappNumber: '91 74288-08884', callNumber: '+91 74288 08884' });
    expect(parsed.whatsappNumber).toBe('917428808884');
    expect(parsed.callNumber).toBe('+917428808884');
  });

  it('wants WhatsApp digits only, without +', () => {
    expect(updateSocialLinksSchema.safeParse({ whatsappNumber: '+917428808884' }).success).toBe(false);
    expect(updateSocialLinksSchema.safeParse({ whatsappNumber: '12345' }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(updateSocialLinksSchema.safeParse({ tiktok: 'https://tiktok.com/@x' }).success).toBe(false);
  });
});
