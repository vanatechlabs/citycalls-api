import { HelpNowHomeSectionModel } from '../home-page/helpNowHome.model';
import { HELP_NOW_RATE_LIMITS, HELP_NOW_SERVICES, HELP_NOW_SERVICE_SLUGS, HelpNowRates } from './helpNowPricing';

// Every service's hourly rate per helper: the one set on its card in Admin →
// Website Section → Help Now → Popular Services, else the default. Bookings
// are priced with these, and the website shows them (GET /bookings/rates).
export async function getHelpNowRates(): Promise<HelpNowRates> {
  const rates = Object.fromEntries(HELP_NOW_SERVICE_SLUGS.map((slug) => [slug, HELP_NOW_SERVICES[slug].ratePerHour])) as HelpNowRates;
  const doc = await HelpNowHomeSectionModel.findOne({ key: 'popular' }).select('content').lean();
  const cards = (doc?.content as { cards?: { slug?: string; ratePerHour?: unknown }[] } | undefined)?.cards ?? [];
  for (const card of cards) {
    const rate = card.ratePerHour;
    if (
      card.slug && card.slug in rates && typeof rate === 'number' && Number.isInteger(rate)
      && rate >= HELP_NOW_RATE_LIMITS.min && rate <= HELP_NOW_RATE_LIMITS.max
    ) {
      rates[card.slug as keyof HelpNowRates] = rate;
    }
  }
  return rates;
}
