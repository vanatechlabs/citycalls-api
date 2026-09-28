import { updateLaunchSpotlightSchema } from './launchSpotlight.validation';

const validSlide = {
  id: 'help-now',
  image: '/assets/Banner/h2.png',
  altText: 'HelpNow professional',
  badgeText: 'NEW LAUNCH',
  heading: 'HelpNow',
  subheading: 'Service Under 60 Mins',
  link: 'https://helpnow.citycalls.in/',
  accentColor: '#f5a623',
  sortOrder: 0,
  status: 'ACTIVE' as const,
};

describe('City Calls launch spotlight validation', () => {
  it('accepts a complete spotlight configuration', () => {
    expect(updateLaunchSpotlightSchema.safeParse({ slides: [validSlide] }).success).toBe(true);
  });

  it('accepts uploaded image paths and internal page links', () => {
    const result = updateLaunchSpotlightSchema.safeParse({
      slides: [{ ...validSlide, image: '/uploads/development/LAUNCH_SPOTLIGHT/id/image.webp', link: '/services/ac-repair' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsafe destination links', () => {
    expect(updateLaunchSpotlightSchema.safeParse({
      slides: [{ ...validSlide, link: 'javascript:alert(1)' }],
    }).success).toBe(false);
  });

  it('rejects duplicate slide ids', () => {
    expect(updateLaunchSpotlightSchema.safeParse({
      slides: [validSlide, { ...validSlide }],
    }).success).toBe(false);
  });
});
