import { DEFAULT_SITE_SETTINGS, siteSettingsSchema } from './siteSettings';

describe('Site settings validation', () => {
  it('the website starts with the see-through navbar', () => {
    expect(DEFAULT_SITE_SETTINGS).toEqual({ solidNavbar: false });
    expect(siteSettingsSchema.safeParse(DEFAULT_SITE_SETTINGS).success).toBe(true);
  });

  it('takes only a true/false switch', () => {
    expect(siteSettingsSchema.parse({ solidNavbar: true })).toEqual({ solidNavbar: true });
    expect(siteSettingsSchema.safeParse({ solidNavbar: 'yes' }).success).toBe(false);
    expect(siteSettingsSchema.safeParse({}).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ solidNavbar: true, theme: 'dark' }).success).toBe(false);
  });
});
