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

  it('adds https:// to links typed without it', () => {
    expect(updateSocialLinksSchema.parse({ facebook: 'facebook.com/citycalls' }).facebook).toBe('https://facebook.com/citycalls');
  });

  it('rejects links that are not websites', () => {
    expect(updateSocialLinksSchema.safeParse({ twitter: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateSocialLinksSchema.safeParse({ youtube: 'citycalls' }).success).toBe(false);
  });

  it('strips spaces and dashes from phone numbers', () => {
    const parsed = updateSocialLinksSchema.parse({ whatsappNumber: '91 74288-08884', callNumber: '+91 74288 08884' });
    expect(parsed.whatsappNumber).toBe('917428808884');
    expect(parsed.callNumber).toBe('+917428808884');
  });

  it('adds the 91 country code to 10-digit numbers', () => {
    const parsed = updateSocialLinksSchema.parse({ whatsappNumber: '7428808884', callNumber: '7428808884' });
    expect(parsed.whatsappNumber).toBe('917428808884');
    expect(parsed.callNumber).toBe('+917428808884');
  });

  it('saves WhatsApp as digits only and rejects short numbers', () => {
    expect(updateSocialLinksSchema.parse({ whatsappNumber: '+917428808884' }).whatsappNumber).toBe('917428808884');
    expect(updateSocialLinksSchema.safeParse({ whatsappNumber: '12345' }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(updateSocialLinksSchema.safeParse({ tiktok: 'https://tiktok.com/@x' }).success).toBe(false);
  });
});
