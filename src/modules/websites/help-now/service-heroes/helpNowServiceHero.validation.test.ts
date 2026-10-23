import { HELP_NOW_SERVICE_SLUGS } from '../bookings/helpNowPricing';
import { serviceHeroDefault } from './helpNowServiceHero.defaults';
import { serviceHeroSchema, serviceHeroSlugParamSchema } from './helpNowServiceHero.validation';

describe('Help Now service page heroes', () => {
  it('accepts every default hero as saved content', () => {
    for (const slug of HELP_NOW_SERVICE_SLUGS) {
      expect(serviceHeroSchema.safeParse(serviceHeroDefault(slug)).success).toBe(true);
    }
  });

  it('only knows the Help Now services', () => {
    expect(serviceHeroSlugParamSchema.safeParse({ slug: 'house-cleaning' }).success).toBe(true);
    expect(serviceHeroSlugParamSchema.safeParse({ slug: 'refrigerator-repair' }).success).toBe(false);
  });

  it('requires the highlight to be part of the heading', () => {
    const hero = serviceHeroDefault('dish-washing');
    expect(serviceHeroSchema.safeParse({ ...hero, highlight: 'Delhi NCR' }).success).toBe(false);
    expect(serviceHeroSchema.safeParse({ ...hero, heading: 'Dish Washing in Delhi NCR', highlight: 'Delhi NCR' }).success).toBe(true);
  });

  it('rejects an empty heading, too many features and unsafe images', () => {
    const hero = serviceHeroDefault('house-cleaning');
    expect(serviceHeroSchema.safeParse({ ...hero, heading: ' ' }).success).toBe(false);
    expect(serviceHeroSchema.safeParse({ ...hero, features: Array(5).fill({ title: 'A', subtitle: 'B' }) }).success).toBe(false);
    expect(serviceHeroSchema.safeParse({ ...hero, image: 'javascript:alert(1)' }).success).toBe(false);
  });
});
