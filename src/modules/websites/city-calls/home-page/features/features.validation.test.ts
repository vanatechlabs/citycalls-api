import { FEATURES_DEFAULTS } from './features.model';
import { updateFeaturesSchema } from './features.validation';

describe('City Calls home features validation', () => {
  it('accepts the bundled default content', () => {
    expect(updateFeaturesSchema.safeParse(FEATURES_DEFAULTS).success).toBe(true);
  });

  it('accepts an uploaded Cloudinary image', () => {
    const result = updateFeaturesSchema.safeParse({
      ...FEATURES_DEFAULTS,
      image: 'https://res.cloudinary.com/demo/image/upload/v1/features.webp',
    });
    expect(result.success).toBe(true);
  });

  it('tidies heading lines and drops blank ones', () => {
    const parsed = updateFeaturesSchema.parse({ ...FEATURES_DEFAULTS, heading: '  Line one \n\n line two  ', highlight: 'line two' });
    expect(parsed.heading).toBe('Line one\nline two');
  });

  it('rejects an empty heading', () => {
    expect(updateFeaturesSchema.safeParse({ ...FEATURES_DEFAULTS, heading: ' \n ', highlight: '' }).success).toBe(false);
  });

  it('rejects a highlight that is not part of the heading', () => {
    expect(updateFeaturesSchema.safeParse({ ...FEATURES_DEFAULTS, highlight: 'not in heading' }).success).toBe(false);
  });

  it('rejects unsafe image values and unknown icons', () => {
    expect(updateFeaturesSchema.safeParse({ ...FEATURES_DEFAULTS, image: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateFeaturesSchema.safeParse({
      ...FEATURES_DEFAULTS,
      items: [{ icon: 'rocket', title: 'X', description: '' }],
    }).success).toBe(false);
  });

  it('requires a title on every card and caps the card count', () => {
    expect(updateFeaturesSchema.safeParse({ ...FEATURES_DEFAULTS, items: [{ icon: 'zap', title: ' ', description: '' }] }).success).toBe(false);
    const tooMany = Array.from({ length: 7 }, () => ({ icon: 'zap', title: 'Card', description: '' }));
    expect(updateFeaturesSchema.safeParse({ ...FEATURES_DEFAULTS, items: tooMany }).success).toBe(false);
  });
});
