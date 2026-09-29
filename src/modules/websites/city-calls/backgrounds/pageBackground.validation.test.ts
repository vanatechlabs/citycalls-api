import { createPageBackgroundSchema, updatePageBackgroundSchema } from './pageBackground.validation';

const base = {
  pagePath: '/services/refrigerator-service',
  subheading: 'Professional & Reliable',
  heading: 'Refrigerator Service in Ghaziabad',
  highlight: 'Ghaziabad',
  description: 'Cooling issues, gas refill, ice buildup — sorted at your doorstep.',
  features: [
    { title: 'Expert', subtitle: 'Technicians' },
    { title: 'Same Day', subtitle: 'Service' },
  ],
  image: 'https://res.cloudinary.com/demo/image/upload/bg.webp',
  imageAlt: 'Technician repairing a refrigerator',
};

describe('City Calls page background validation', () => {
  it('accepts a full hero entry', () => {
    expect(createPageBackgroundSchema.safeParse(base).success).toBe(true);
  });

  it('requires a heading', () => {
    expect(createPageBackgroundSchema.safeParse({ ...base, heading: '  ' }).success).toBe(false);
  });

  it('rejects a highlight that is not part of the heading', () => {
    expect(createPageBackgroundSchema.safeParse({ ...base, highlight: 'Noida' }).success).toBe(false);
    expect(updatePageBackgroundSchema.safeParse({ heading: 'AC Service in Delhi', highlight: 'Noida' }).success).toBe(false);
  });

  it('allows at most 4 features, each with a title', () => {
    const five = Array.from({ length: 5 }, () => ({ title: 'Expert', subtitle: 'Technicians' }));
    expect(createPageBackgroundSchema.safeParse({ ...base, features: five }).success).toBe(false);
    expect(createPageBackgroundSchema.safeParse({ ...base, features: [{ title: '', subtitle: 'x' }] }).success).toBe(false);
  });

  it('only takes uploaded paths or http(s) image URLs', () => {
    expect(createPageBackgroundSchema.safeParse({ ...base, image: 'javascript:alert(1)' }).success).toBe(false);
    expect(createPageBackgroundSchema.safeParse({ ...base, image: '/uploads/bg.png' }).success).toBe(true);
  });

  it('keeps the page path fixed on update', () => {
    expect(updatePageBackgroundSchema.safeParse({ pagePath: '/about' }).success).toBe(false);
    expect(updatePageBackgroundSchema.safeParse({}).success).toBe(false);
  });
});
