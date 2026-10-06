import {
  createHomeBannerSchema,
  listHomeBannersQuerySchema,
  updateHomeBannerSchema,
} from './homeBanner.validation';

const validBanner = {
  tagLine: 'Trusted Professionals',
  titleLine1: 'AC Service',
  titleLine2: '& Repair',
  description: 'Expert technicians for cooling, gas refill and installation.',
  buttonText: 'Book a Service',
};

describe('Customer app home banner validation', () => {
  it('accepts a complete banner and applies defaults', () => {
    const result = createHomeBannerSchema.parse(validBanner);
    expect(result.sortOrder).toBe(0);
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects a banner without its button text', () => {
    expect(createHomeBannerSchema.safeParse({ ...validBanner, buttonText: undefined }).success).toBe(false);
  });

  it('accepts an uploaded local image path on update', () => {
    expect(updateHomeBannerSchema.safeParse({ image: '/uploads/development/APP_HOME_BANNER/id/image.webp' }).success).toBe(true);
  });

  it('rejects an image that is not an upload path or URL', () => {
    expect(updateHomeBannerSchema.safeParse({ image: 'banner.png' }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(updateHomeBannerSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown list filters', () => {
    expect(listHomeBannersQuerySchema.safeParse({ website: 'help-now' }).success).toBe(false);
  });
});
