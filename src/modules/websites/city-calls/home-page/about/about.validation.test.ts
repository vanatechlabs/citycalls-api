import { ABOUT_DEFAULTS } from './about.model';
import { updateAboutSchema } from './about.validation';

describe('City Calls home about validation', () => {
  it('accepts the bundled default content', () => {
    expect(updateAboutSchema.safeParse(ABOUT_DEFAULTS).success).toBe(true);
  });

  it('accepts uploaded Cloudinary images', () => {
    const images = ABOUT_DEFAULTS.images.map((img, i) => ({ ...img, image: `https://res.cloudinary.com/demo/image/upload/v1/about${i}.webp` }));
    expect(updateAboutSchema.safeParse({ ...ABOUT_DEFAULTS, images }).success).toBe(true);
  });

  it('drops empty points', () => {
    const parsed = updateAboutSchema.parse({ ...ABOUT_DEFAULTS, points: ['One', '  ', 'Two'] });
    expect(parsed.points).toEqual(['One', 'Two']);
  });

  it('rejects a missing heading and a highlight outside the heading', () => {
    expect(updateAboutSchema.safeParse({ ...ABOUT_DEFAULTS, heading: ' ', highlight: '' }).success).toBe(false);
    expect(updateAboutSchema.safeParse({ ...ABOUT_DEFAULTS, highlight: 'Not there' }).success).toBe(false);
  });

  it('needs exactly three image slots and safe values', () => {
    expect(updateAboutSchema.safeParse({ ...ABOUT_DEFAULTS, images: ABOUT_DEFAULTS.images.slice(0, 2) }).success).toBe(false);
    const bad = ABOUT_DEFAULTS.images.map((img) => ({ ...img, image: 'javascript:alert(1)' }));
    expect(updateAboutSchema.safeParse({ ...ABOUT_DEFAULTS, images: bad }).success).toBe(false);
  });

  it('rejects unsafe button links', () => {
    expect(updateAboutSchema.safeParse({ ...ABOUT_DEFAULTS, buttonLink: 'javascript:alert(1)' }).success).toBe(false);
  });
});
