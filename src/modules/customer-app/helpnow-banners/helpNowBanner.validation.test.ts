import {
  createHelpNowBannerSchema,
  listHelpNowBannersQuerySchema,
  updateHelpNowBannerSchema,
} from './helpNowBanner.validation';

const validBanner = {
  tagLine: 'Quick Help',
  titleLine1: 'Plumber & Electrician',
  titleLine2: 'In 60 Minutes',
  description: 'Verified experts for urgent home fixes.',
  buttonText: 'Book a Service',
};

describe('Customer app HelpNow banner validation', () => {
  it('accepts a complete banner and applies defaults', () => {
    const result = createHelpNowBannerSchema.parse(validBanner);
    expect(result.sortOrder).toBe(0);
    expect(result.status).toBe('ACTIVE');
  });

  it('rejects a banner without its button text', () => {
    expect(createHelpNowBannerSchema.safeParse({ ...validBanner, buttonText: undefined }).success).toBe(false);
  });

  it('accepts an uploaded local image path on update', () => {
    expect(updateHelpNowBannerSchema.safeParse({ image: '/uploads/development/APP_HELPNOW_BANNER/id/image.webp' }).success).toBe(true);
  });

  it('rejects an image that is not an upload path or URL', () => {
    expect(updateHelpNowBannerSchema.safeParse({ image: 'banner.png' }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(updateHelpNowBannerSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown list filters', () => {
    expect(listHelpNowBannersQuerySchema.safeParse({ website: 'help-now' }).success).toBe(false);
  });
});
