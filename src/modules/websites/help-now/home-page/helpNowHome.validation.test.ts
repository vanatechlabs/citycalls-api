import { HELP_NOW_HOME_DEFAULTS } from './helpNowHome.defaults';
import { aboutSchema, faqSchema, heroSchema, marqueeSchema, popularSchema, pricingSchema, servicesSchema, stepsSchema } from './helpNowHome.validation';

describe('Help Now home page sections', () => {
  it('accepts every default section as saved content', () => {
    expect(heroSchema.safeParse(HELP_NOW_HOME_DEFAULTS.hero).success).toBe(true);
    expect(marqueeSchema.safeParse(HELP_NOW_HOME_DEFAULTS.marquee).success).toBe(true);
    expect(aboutSchema.safeParse(HELP_NOW_HOME_DEFAULTS.about).success).toBe(true);
    expect(servicesSchema.safeParse(HELP_NOW_HOME_DEFAULTS.services).success).toBe(true);
    expect(faqSchema.safeParse(HELP_NOW_HOME_DEFAULTS.faq).success).toBe(true);
    expect(popularSchema.safeParse(HELP_NOW_HOME_DEFAULTS.popular).success).toBe(true);
    expect(stepsSchema.safeParse(HELP_NOW_HOME_DEFAULTS.steps).success).toBe(true);
    expect(pricingSchema.safeParse(HELP_NOW_HOME_DEFAULTS.pricing).success).toBe(true);
  });

  it('keeps one popular-services card per real service', () => {
    const popular = HELP_NOW_HOME_DEFAULTS.popular;
    const first = popular.cards[0];
    expect(popularSchema.safeParse({ ...popular, cards: [first, first] }).success).toBe(false);
    expect(popularSchema.safeParse({ ...popular, cards: [{ ...first, slug: 'ac-repair' }] }).success).toBe(false);
    expect(popularSchema.safeParse({ ...popular, cards: [{ ...first, ratePerHour: 10 }] }).success).toBe(false);
    expect(popularSchema.safeParse({ ...popular, cards: [{ ...first, ratePerHour: 199.5 }] }).success).toBe(false);
    expect(popularSchema.safeParse({ ...popular, cards: [{ ...first, ratePerHour: 249 }] }).success).toBe(true);
  });

  it('needs at least two booking steps and caps the pricing perks', () => {
    const steps = HELP_NOW_HOME_DEFAULTS.steps;
    expect(stepsSchema.safeParse({ ...steps, items: steps.items.slice(0, 1) }).success).toBe(false);
    const pricing = HELP_NOW_HOME_DEFAULTS.pricing;
    expect(pricingSchema.safeParse({ ...pricing, perks: [...pricing.perks, pricing.perks[0]] }).success).toBe(false);
    expect(pricingSchema.safeParse({ ...pricing, highlight: 'not in heading' }).success).toBe(false);
  });

  it('keeps the word "maid" out of the new sections', () => {
    const text = JSON.stringify([HELP_NOW_HOME_DEFAULTS.popular, HELP_NOW_HOME_DEFAULTS.steps, HELP_NOW_HOME_DEFAULTS.pricing]);
    expect(text.toLowerCase()).not.toContain('maid');
  });

  it('gives every default image an alt text', () => {
    const images = [
      ...HELP_NOW_HOME_DEFAULTS.hero.slides,
      ...HELP_NOW_HOME_DEFAULTS.about.cards,
      ...HELP_NOW_HOME_DEFAULTS.services.cards,
      ...HELP_NOW_HOME_DEFAULTS.faq.items,
      ...HELP_NOW_HOME_DEFAULTS.popular.cards,
    ];
    for (const item of images) expect(item.alt.length).toBeGreaterThan(0);
  });

  it('rejects an empty hero and unsafe links or images', () => {
    expect(heroSchema.safeParse({ slides: [] }).success).toBe(false);
    const slide = { ...HELP_NOW_HOME_DEFAULTS.hero.slides[0] };
    expect(heroSchema.safeParse({ slides: [{ ...slide, primaryButtonLink: 'javascript:alert(1)' }] }).success).toBe(false);
    expect(heroSchema.safeParse({ slides: [{ ...slide, image: 'data:image/png;base64,AAAA' }] }).success).toBe(false);
  });

  it('requires the About highlight to be part of the heading', () => {
    expect(aboutSchema.safeParse({ ...HELP_NOW_HOME_DEFAULTS.about, highlight: 'HelpNow Pro' }).success).toBe(false);
  });

  it('rejects unknown marquee icons', () => {
    expect(marqueeSchema.safeParse({ items: [{ label: 'Hi', icon: 'Rocket' }], status: 'ACTIVE' }).success).toBe(false);
  });
});
