import { createPageParallaxSchema, publicPageParallaxQuerySchema, updatePageParallaxSchema } from './pageParallax.validation';

const valid = {
  pagePath: '/services/ac-service',
  subheading: 'Appliance Repair',
  heading: 'Expert Repair at Your Doorstep',
  highlight: 'Your Doorstep',
  description: 'We bring your appliances back to life.',
  image: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg',
  imageAlt: 'Technician repairing an AC',
};

describe('Page parallax validation', () => {
  it('accepts a full entry', () => {
    expect(createPageParallaxSchema.safeParse(valid).success).toBe(true);
  });

  it('needs a page and a heading, and rejects unknown fields', () => {
    expect(createPageParallaxSchema.safeParse({ ...valid, pagePath: undefined }).success).toBe(false);
    expect(createPageParallaxSchema.safeParse({ ...valid, heading: '' }).success).toBe(false);
    expect(createPageParallaxSchema.safeParse({ ...valid, features: [] }).success).toBe(false);
  });

  it('highlight must be part of the heading', () => {
    expect(createPageParallaxSchema.safeParse({ ...valid, highlight: 'Noida' }).success).toBe(false);
    expect(updatePageParallaxSchema.safeParse({ heading: 'Fast Repair', highlight: 'Slow' }).success).toBe(false);
  });

  it('takes uploaded or http images only', () => {
    expect(createPageParallaxSchema.safeParse({ ...valid, image: '/uploads/a.webp' }).success).toBe(true);
    expect(createPageParallaxSchema.safeParse({ ...valid, image: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('partial update changes only what is sent', () => {
    expect(updatePageParallaxSchema.parse({ status: 'INACTIVE' })).toEqual({ status: 'INACTIVE' });
    expect(updatePageParallaxSchema.safeParse({}).success).toBe(false);
    expect(updatePageParallaxSchema.safeParse({ pagePath: '/services/x' }).success).toBe(false);
  });

  it('public lookup needs a page path', () => {
    expect(publicPageParallaxQuerySchema.safeParse({ path: '/services/ac-service' }).success).toBe(true);
    expect(publicPageParallaxQuerySchema.safeParse({}).success).toBe(false);
  });
});
