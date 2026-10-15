import { createLocationPageSchema, updateLocationPageSchema } from './locationPage.validation';

const valid = {
  pageType: 'SERVICE',
  navServiceId: '64b7f0c2a1b2c3d4e5f60718',
  location: 'Noida',
  slug: 'refrigerator-service-in-noida',
  title: 'Refrigerator Service in Noida',
  shortDescription: 'Cooling issues, gas refill, ice buildup — sorted at your doorstep in Noida.',
  content: '<p>Refrigerator repair in Noida.</p>',
};

describe('Location page validation', () => {
  it('accepts a service page for a city and fills the optional fields', () => {
    const parsed = createLocationPageSchema.parse(valid);
    expect(parsed.status).toBe('DRAFT');
    expect(parsed.features).toEqual([]);
    expect(parsed.metaTitle).toBe('');
  });

  it('needs the service for a SERVICE page, but not for the home page', () => {
    const { navServiceId: _drop, ...noService } = valid;
    expect(createLocationPageSchema.safeParse(noService).success).toBe(false);
    expect(createLocationPageSchema.safeParse({ ...noService, pageType: 'HOME', slug: 'home-services-in-noida' }).success).toBe(true);
  });

  it("won't take a URL used by a website page, or a messy one", () => {
    expect(createLocationPageSchema.safeParse({ ...valid, slug: 'blogs' }).success).toBe(false);
    expect(createLocationPageSchema.safeParse({ ...valid, slug: 'Fridge-Repair-Noida' }).success).toBe(true); // lower-cased…
    expect(createLocationPageSchema.safeParse({ ...valid, slug: 'fridge repair' }).success).toBe(false); // …but no spaces
  });

  it('takes up to 4 hero features and valid JSON-LD only', () => {
    const feature = { title: 'Same Day', subtitle: 'Service' };
    expect(createLocationPageSchema.safeParse({ ...valid, features: [feature, feature, feature, feature] }).success).toBe(true);
    expect(createLocationPageSchema.safeParse({ ...valid, features: [feature, feature, feature, feature, feature] }).success).toBe(false);
    expect(createLocationPageSchema.safeParse({ ...valid, schemaMarkup: '{not json' }).success).toBe(false);
  });

  it('an update can change just the status', () => {
    expect(updateLocationPageSchema.parse({ status: 'PUBLISHED' })).toEqual({ status: 'PUBLISHED' });
    expect(updateLocationPageSchema.safeParse({}).success).toBe(false);
  });
});
