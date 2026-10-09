import {
  ABOUT_HERO_DEFAULTS, ABOUT_MILESTONE_DEFAULTS, ABOUT_PARALLAX_DEFAULTS, ABOUT_STORY_DEFAULTS, ABOUT_VALUE_DEFAULTS,
} from './aboutPage.model';
import {
  createAboutMilestoneSchema, createAboutValueSchema, updateAboutHeroSchema, updateAboutListHeadingSchema, updateAboutMilestoneSchema,
  updateAboutParallaxSchema, updateAboutStorySchema,
} from './aboutPage.validation';

describe('About page validation', () => {
  it('the website defaults pass validation', () => {
    expect(updateAboutHeroSchema.safeParse(ABOUT_HERO_DEFAULTS).success).toBe(true);
    expect(updateAboutStorySchema.safeParse(ABOUT_STORY_DEFAULTS).success).toBe(true);
    expect(updateAboutParallaxSchema.safeParse(ABOUT_PARALLAX_DEFAULTS).success).toBe(true);
    for (const value of ABOUT_VALUE_DEFAULTS) expect(createAboutValueSchema.safeParse(value).success).toBe(true);
    for (const milestone of ABOUT_MILESTONE_DEFAULTS) expect(createAboutMilestoneSchema.safeParse(milestone).success).toBe(true);
  });

  it('hero highlight may sit in either heading line, but must be in one', () => {
    const hero = { ...ABOUT_HERO_DEFAULTS };
    expect(updateAboutHeroSchema.safeParse({ ...hero, highlight: 'Trust' }).success).toBe(true);
    expect(updateAboutHeroSchema.safeParse({ ...hero, highlight: 'Service' }).success).toBe(true);
    expect(updateAboutHeroSchema.safeParse({ ...hero, highlight: 'Noida' }).success).toBe(false);
  });

  it('hero keeps at most 6 points and only safe links', () => {
    const hero = { ...ABOUT_HERO_DEFAULTS };
    expect(updateAboutHeroSchema.safeParse({ ...hero, points: Array(7).fill('Point') }).success).toBe(false);
    expect(updateAboutHeroSchema.safeParse({ ...hero, points: ['ok', ''] }).success).toBe(false);
    expect(updateAboutHeroSchema.safeParse({ ...hero, primaryButtonLink: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateAboutHeroSchema.safeParse({ ...hero, primaryButtonLink: 'https://citycalls.in/services' }).success).toBe(true);
  });

  it('story holds up to 4 images, and its highlight must be in the heading', () => {
    const story = { ...ABOUT_STORY_DEFAULTS };
    const img = { image: '/uploads/a.webp', imageAlt: 'a' };
    expect(updateAboutStorySchema.safeParse({ ...story, images: [img, img, img, img, img] }).success).toBe(false);
    expect(updateAboutStorySchema.safeParse({ ...story, highlight: 'Noida' }).success).toBe(false);
  });

  it('rejects unsafe images and unknown fields', () => {
    expect(updateAboutParallaxSchema.safeParse({ image: 'javascript:alert(1)' }).success).toBe(false);
    expect(updateAboutParallaxSchema.safeParse({ image: '/uploads/a.webp', extra: 1 }).success).toBe(false);
    expect(createAboutValueSchema.safeParse({ title: 'Trust', icon: 'Rocket' }).success).toBe(false);
  });

  it('fills in defaults and supports partial updates', () => {
    expect(createAboutValueSchema.parse({ title: 'Trust first' })).toMatchObject({ description: '', icon: 'ShieldCheck', sortOrder: 0, status: 'ACTIVE' });
    expect(createAboutMilestoneSchema.parse({ year: '2028', title: 'Next' })).toMatchObject({ icon: 'Flag', image: '', tag: '' });
    expect(updateAboutMilestoneSchema.parse({ image: '/uploads/a.webp' })).toEqual({ image: '/uploads/a.webp' });
    expect(updateAboutMilestoneSchema.safeParse({}).success).toBe(false);
    expect(updateAboutListHeadingSchema.safeParse({ eyebrow: 'x' }).success).toBe(false);
  });
});
