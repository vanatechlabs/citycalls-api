import { HELP_NOW_HOME_DEFAULTS } from './helpNowHome.defaults';
import { aboutSchema, faqSchema, heroSchema, marqueeSchema, servicesSchema } from './helpNowHome.validation';

describe('Help Now home page sections', () => {
  it('accepts every default section as saved content', () => {
    expect(heroSchema.safeParse(HELP_NOW_HOME_DEFAULTS.hero).success).toBe(true);
    expect(marqueeSchema.safeParse(HELP_NOW_HOME_DEFAULTS.marquee).success).toBe(true);
    expect(aboutSchema.safeParse(HELP_NOW_HOME_DEFAULTS.about).success).toBe(true);
    expect(servicesSchema.safeParse(HELP_NOW_HOME_DEFAULTS.services).success).toBe(true);
    expect(faqSchema.safeParse(HELP_NOW_HOME_DEFAULTS.faq).success).toBe(true);
  });

  it('gives every default image an alt text', () => {
    const images = [
      ...HELP_NOW_HOME_DEFAULTS.hero.slides,
      ...HELP_NOW_HOME_DEFAULTS.about.cards,
      ...HELP_NOW_HOME_DEFAULTS.services.cards,
      ...HELP_NOW_HOME_DEFAULTS.faq.items,
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
