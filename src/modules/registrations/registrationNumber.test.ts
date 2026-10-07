import { DEFAULT_NUMBER_SETTINGS, formatRegistrationNo, registrationNumberSettingsSchema } from './registrationNumber';

// 7 Oct 2026, 1:30 PM in India (08:00 UTC).
const OCT_7 = new Date('2026-10-07T08:00:00Z');

describe('Registration number series', () => {
  it('defaults to CC + YYYYMMDD + 2-digit running number', () => {
    expect(formatRegistrationNo(DEFAULT_NUMBER_SETTINGS, 5, OCT_7)).toBe('CC2026100705');
    expect(formatRegistrationNo(DEFAULT_NUMBER_SETTINGS, 1, OCT_7)).toBe('CC2026100701');
  });

  it('uses the India date, not UTC', () => {
    // 31 Dec 2026, 8 PM UTC is already 1 Jan 2027 in India.
    expect(formatRegistrationNo(DEFAULT_NUMBER_SETTINGS, 1, new Date('2026-12-31T20:00:00Z'))).toBe('CC2027010101');
  });

  it('follows the chosen prefix, date parts, digits and separator', () => {
    const monthly = { ...DEFAULT_NUMBER_SETTINGS, prefix: 'CCX', includeDay: false, sequenceDigits: 3, separator: '-' as const };
    expect(formatRegistrationNo(monthly, 12, OCT_7)).toBe('CCX-202610-012');
    const noDate = { ...DEFAULT_NUMBER_SETTINGS, includeYear: false, includeMonth: false, includeDay: false };
    expect(formatRegistrationNo(noDate, 7, OCT_7)).toBe('CC07');
  });

  it('keeps counting past the digit count instead of wrapping', () => {
    expect(formatRegistrationNo(DEFAULT_NUMBER_SETTINGS, 100, OCT_7)).toBe('CC20261007100');
  });

  it('validates the settings form', () => {
    expect(registrationNumberSettingsSchema.safeParse({ ...DEFAULT_NUMBER_SETTINGS, prefix: 'cc' }).data?.prefix).toBe('CC');
    expect(registrationNumberSettingsSchema.safeParse({ ...DEFAULT_NUMBER_SETTINGS, prefix: 'C C' }).success).toBe(false);
    expect(registrationNumberSettingsSchema.safeParse({ ...DEFAULT_NUMBER_SETTINGS, sequenceDigits: 1 }).success).toBe(false);
    expect(registrationNumberSettingsSchema.safeParse({ ...DEFAULT_NUMBER_SETTINGS, separator: '_' }).success).toBe(false);
  });
});
