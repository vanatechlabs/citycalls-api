import { HELP_NOW_SERVICES, HelpNowServiceSlug } from '../bookings/helpNowPricing';
import type { ServiceHeroContent } from './helpNowServiceHero.validation';

// What each service page's hero shows when nothing is saved — the same as the
// website's built-in hero (nexthelpnow ServiceHero + data/helpNowServices.ts),
// so the admin form opens filled in. Images are the website's own files.
const HERO: Record<HelpNowServiceSlug, { image: string; description: string }> = {
  'house-cleaning': { image: '/assets/Banner/h1.png', description: 'Floors, furniture, fans and bedrooms kept neat and dust-free.' },
  'dish-washing': { image: '/assets/Banner/h2.png', description: 'Utensils washed, sink scrubbed, stove wiped and kitchen waste cleared.' },
  'kitchen-assistance': { image: '/assets/Images/h2.png', description: 'Vegetables chopped, dough kneaded and ingredients prepped for cooking.' },
  'bathroom-cleaning': { image: '/assets/Banner/h3.png', description: 'Mirrors, WC, washbasin, fittings and floor cleaned and dried.' },
  'laundry-ironing': { image: '/assets/Images/h4.png', description: 'Clothes sorted, machine-washed, dried, ironed and arranged in cupboards.' },
  'dusting-wiping': { image: '/assets/Images/h3.png', description: 'Shelves, tables, window sills, grills and cobwebs dusted and wiped.' },
  'everyday-home-help': { image: '/assets/Images/ab3.png', description: 'Fans, fridge, wardrobes, kitchen slab, windows and more — mix and match.' },
};

export const DEFAULT_SERVICE_HERO_FEATURES = [
  { title: 'Trained', subtitle: 'Professionals' },
  { title: 'Safe &', subtitle: 'Reliable' },
  { title: 'Hourly', subtitle: 'Pricing' },
  { title: 'Flexible', subtitle: 'Time Slots' },
];

export function serviceHeroDefault(slug: HelpNowServiceSlug): ServiceHeroContent {
  const name = HELP_NOW_SERVICES[slug].name;
  return {
    subheading: 'Trusted Home Services',
    heading: `Professional ${name}`,
    highlight: name,
    description: HERO[slug].description,
    features: DEFAULT_SERVICE_HERO_FEATURES.map((feature) => ({ ...feature })),
    image: HERO[slug].image,
    imageAlt: `${name} by a Help Now helper`,
    status: 'ACTIVE',
  };
}
