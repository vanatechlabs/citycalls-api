import {
  createSalonBannerSchema,
  listSalonBannersQuerySchema,
  updateSalonBannerSchema,
} from './salonBanner.validation';

const validBanner = {
  tagLine: 'Salon at Home',
  titleLine1: 'Haircut & Styling',
  titleLine2: 'At Your Doorstep',
  description: 'Trained stylists with salon-grade products.',
  buttonText: 'Book a Service',
};

describe('Customer app salon banner validation', () => {
  it('accepts a complete banner and applies defaults', () => {
    const result = createSalonBannerSchema.parse(validBanner);
    expect(result.sortOrder).toBe(0);
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects a banner without its button text', () => {
    expect(createSalonBannerSchema.safeParse({ ...validBanner, buttonText: undefined }).success).toBe(false);
  });

  it('accepts an uploaded local image path on update', () => {
    expect(updateSalonBannerSchema.safeParse({ image: '/uploads/development/APP_SALON_BANNER/id/image.webp' }).success).toBe(true);
  });

  it('rejects an image that is not an upload path or URL', () => {
    expect(updateSalonBannerSchema.safeParse({ image: 'banner.png' }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(updateSalonBannerSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown list filters', () => {
    expect(listSalonBannersQuerySchema.safeParse({ website: 'help-now' }).success).toBe(false);
  });
});
