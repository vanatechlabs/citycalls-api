import { pagePathSchema } from '../../city-calls/seo/seoMeta.validation';
import { HELP_NOW_SEO_PAGES, helpNowSeoKey, isHelpNowSeoKey } from './helpNowSeo.pages';

describe('Help Now SEO pages', () => {
  it('stores Help Now paths under their own prefix', () => {
    expect(helpNowSeoKey('/')).toBe('/helpnow-site');
    expect(helpNowSeoKey('/services/dish-washing')).toBe('/helpnow-site/services/dish-washing');
  });

  it('tells Help Now entries apart from City Calls ones', () => {
    expect(isHelpNowSeoKey('/helpnow-site')).toBe(true);
    expect(isHelpNowSeoKey('/helpnow-site/services/house-cleaning')).toBe(true);
    expect(isHelpNowSeoKey('/')).toBe(false);
    expect(isHelpNowSeoKey('/services/ac-service')).toBe(false);
    expect(isHelpNowSeoKey('/helpnow-sites')).toBe(false);
  });

  it('lists the home page and every service as valid SEO paths', () => {
    expect(HELP_NOW_SEO_PAGES).toHaveLength(8);
    for (const page of HELP_NOW_SEO_PAGES) expect(pagePathSchema.safeParse(page.path).success).toBe(true);
  });
});
