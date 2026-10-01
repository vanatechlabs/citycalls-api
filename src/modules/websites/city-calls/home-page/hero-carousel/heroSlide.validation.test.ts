import {
  createHeroSlideSchema,
  listHeroSlidesQuerySchema,
  updateHeroSlideSchema,
} from './heroSlide.validation';

const validSlide = {
  subtitle: 'Premium Home Cleaning',
  titleLine1: 'Spotless Homes,',
  titleLine2: 'Zero Hassle.',
  description: 'Background-verified professionals at your doorstep.',
  sortOrder: 1,
  status: 'ACTIVE' as const,
};

describe('City Calls home hero slide validation', () => {
  it('accepts an overlay darkness from 0 to 90, and null to reset it', () => {
    expect(createHeroSlideSchema.parse({ ...validSlide, overlayOpacity: 30 }).overlayOpacity).toBe(30);
    expect(updateHeroSlideSchema.parse({ overlayOpacity: null }).overlayOpacity).toBeNull();
    expect(updateHeroSlideSchema.safeParse({ overlayOpacity: 95 }).success).toBe(false);
    expect(updateHeroSlideSchema.safeParse({ overlayOpacity: -1 }).success).toBe(false);
  });

  it('accepts a complete slide and applies defaults', () => {
    const result = createHeroSlideSchema.parse({
      subtitle: validSlide.subtitle,
      titleLine1: validSlide.titleLine1,
      titleLine2: validSlide.titleLine2,
      description: validSlide.description,
    });

    expect(result.sortOrder).toBe(0);
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects missing required home-page copy', () => {
    expect(createHeroSlideSchema.safeParse({ subtitle: 'Only one field' }).success).toBe(false);
  });

  it('accepts an uploaded local image path on update', () => {
    expect(updateHeroSlideSchema.safeParse({ image: '/uploads/development/HERO_SLIDE/id/image.webp' }).success).toBe(true);
  });

  it('rejects an empty update', () => {
    expect(updateHeroSlideSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown list filters', () => {
    expect(listHeroSlidesQuerySchema.safeParse({ website: 'help-now' }).success).toBe(false);
  });
});
