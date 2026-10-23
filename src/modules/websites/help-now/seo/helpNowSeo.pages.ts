import { HELP_NOW_SERVICES, HELP_NOW_SERVICE_SLUGS } from '../bookings/helpNowPricing';

// Help Now pages in Admin → SEO Manager. SEO entries share one collection
// with City Calls, keyed by path, so Help Now's paths are stored under this
// prefix ("/helpnow-site", "/helpnow-site/services/dish-washing") and can never
// clash with a City Calls page of the same path ("/").
export const HELP_NOW_SEO_PREFIX = '/helpnow-site';

export const helpNowSeoKey = (sitePath: string) => (sitePath === '/' ? HELP_NOW_SEO_PREFIX : `${HELP_NOW_SEO_PREFIX}${sitePath}`);

export const isHelpNowSeoKey = (pagePath: string) =>
  pagePath === HELP_NOW_SEO_PREFIX || pagePath.startsWith(`${HELP_NOW_SEO_PREFIX}/`);

// Every Help Now website page SEO can be written for: the home page and each service page.
export const HELP_NOW_SEO_PAGES = [
  { path: helpNowSeoKey('/'), name: 'Help Now — Home' },
  ...HELP_NOW_SERVICE_SLUGS.map((slug) => ({
    path: helpNowSeoKey(`/services/${slug}`),
    name: `Help Now — ${HELP_NOW_SERVICES[slug].name}`,
  })),
];
