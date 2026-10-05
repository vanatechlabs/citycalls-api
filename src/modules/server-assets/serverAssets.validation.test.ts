import { createServerAssetSchema, updateServerAssetSchema } from './serverAssets.validation';

const domain = {
  type: 'DOMAIN' as const,
  name: 'citycalls.in',
  provider: 'GoDaddy',
  purchasedOn: '2025-10-05',
  expiresOn: '2026-10-05',
};

describe('Server asset validation', () => {
  it('accepts a domain and fills defaults', () => {
    const parsed = createServerAssetSchema.parse(domain);
    expect(parsed.expiresOn).toBeInstanceOf(Date);
    expect(parsed.reminderDays).toBe(30);
    expect(parsed.autoRenew).toBe(false);
  });

  it('needs a type, a name and a valid expiry date', () => {
    expect(createServerAssetSchema.safeParse({ ...domain, type: 'EMAIL' }).success).toBe(false);
    expect(createServerAssetSchema.safeParse({ ...domain, name: ' ' }).success).toBe(false);
    expect(createServerAssetSchema.safeParse({ ...domain, expiresOn: 'not a date' }).success).toBe(false);
  });

  it('rejects a purchase date after the expiry date', () => {
    expect(createServerAssetSchema.safeParse({ ...domain, purchasedOn: '2027-01-01' }).success).toBe(false);
  });

  it('keeps reminder days between 1 and 365', () => {
    expect(createServerAssetSchema.safeParse({ ...domain, reminderDays: 0 }).success).toBe(false);
    expect(createServerAssetSchema.safeParse({ ...domain, reminderDays: 400 }).success).toBe(false);
  });

  it('allows partial updates but not empty ones', () => {
    expect(updateServerAssetSchema.safeParse({ expiresOn: '2027-10-05' }).success).toBe(true);
    expect(updateServerAssetSchema.safeParse({}).success).toBe(false);
  });
});
