import {
  createOfferSchema,
  listOffersQuerySchema,
  updateOfferSchema,
  updateOfferStripSchema,
} from './offers.validation';

describe('City Calls home offers validation', () => {
  it('accepts a minimal offer card and applies defaults', () => {
    const result = createOfferSchema.parse({ title: 'AC Servicing' });

    expect(result.icon).toBe('Gift');
    expect(result.sortOrder).toBe(0);
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects an offer without a title', () => {
    expect(createOfferSchema.safeParse({ couponCode: 'COOL20' }).success).toBe(false);
  });

  it('rejects an unknown icon', () => {
    expect(createOfferSchema.safeParse({ title: 'x', icon: 'Rocket' }).success).toBe(false);
  });

  it('rejects an empty offer update', () => {
    expect(updateOfferSchema.safeParse({}).success).toBe(false);
  });

  it('accepts hex, rgba and gradient strip colours', () => {
    expect(updateOfferStripSchema.safeParse({
      bgGradientFrom: '#020617',
      couponBg: 'rgba(251, 191, 36, 0.12)',
      bgGradientVia: 'linear-gradient(to right, #fff, #000)',
    }).success).toBe(true);
  });

  it('rejects colours that could load external content', () => {
    expect(updateOfferStripSchema.safeParse({ discountBg: 'url(https://evil.test/x.png)' }).success).toBe(false);
    expect(updateOfferStripSchema.safeParse({ discountBg: 'red; background: blue' }).success).toBe(false);
  });

  it('rejects javascript: button links', () => {
    expect(updateOfferStripSchema.safeParse({ buttonLink: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateOfferStripSchema.safeParse({ buttonLink: '/services' }).success).toBe(true);
  });

  it('rejects unknown list filters', () => {
    expect(listOffersQuerySchema.safeParse({ website: 'help-now' }).success).toBe(false);
  });
});
