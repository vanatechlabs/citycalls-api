import { ActorSnapshot } from '../../../../lib/actor';
import { HELP_NOW_SERVICES, HELP_NOW_SERVICE_SLUGS, HelpNowServiceSlug } from '../bookings/helpNowPricing';
import { serviceHeroDefault } from './helpNowServiceHero.defaults';
import { HelpNowServiceHeroModel } from './helpNowServiceHero.model';
import { ServiceHeroContent } from './helpNowServiceHero.validation';

const FIELDS = 'slug subheading heading highlight description features image imageAlt status updatedBy updatedAt';

// Admin's page picker: every service, and whether its hero has been saved.
export async function listHelpNowServiceHeroes() {
  const saved = await HelpNowServiceHeroModel.find({}, 'slug status updatedAt').lean();
  const bySlug = new Map(saved.map((doc) => [doc.slug, doc]));
  return HELP_NOW_SERVICE_SLUGS.map((slug) => {
    const doc = bySlug.get(slug);
    return {
      slug,
      name: HELP_NOW_SERVICES[slug].name,
      path: `/services/${slug}`,
      saved: !!doc,
      status: doc?.status ?? null,
      updatedAt: doc?.updatedAt ?? null,
    };
  });
}

// The saved hero, or the website's built-in one (unsaved) to start from.
// Read-only: opening the form never writes.
export async function getHelpNowServiceHero(slug: HelpNowServiceSlug) {
  const doc = await HelpNowServiceHeroModel.findOne({ slug }, FIELDS).lean();
  const base = { slug, name: HELP_NOW_SERVICES[slug].name, path: `/services/${slug}` };
  if (doc) return { ...base, _id: doc._id, ...pick(doc), saved: true, updatedBy: doc.updatedBy, updatedAt: doc.updatedAt };
  return { ...base, _id: null, ...serviceHeroDefault(slug), saved: false, updatedBy: null, updatedAt: null };
}

export async function saveHelpNowServiceHero(slug: HelpNowServiceSlug, content: ServiceHeroContent, actor: ActorSnapshot) {
  await HelpNowServiceHeroModel.findOneAndUpdate(
    { slug },
    { $set: { ...content, updatedBy: actor }, $setOnInsert: { slug } },
    { upsert: true, runValidators: true }
  );
  return getHelpNowServiceHero(slug);
}

// Website: an active saved hero, else null (the page keeps its built-in hero).
export async function getPublicHelpNowServiceHero(slug: HelpNowServiceSlug) {
  const doc = await HelpNowServiceHeroModel.findOne({ slug, status: 'ACTIVE' }, FIELDS).lean();
  return doc ? pick(doc) : null;
}

function pick(doc: ServiceHeroContent): ServiceHeroContent {
  return {
    subheading: doc.subheading ?? '',
    heading: doc.heading,
    highlight: doc.highlight ?? '',
    description: doc.description ?? '',
    features: (doc.features ?? []).map((f) => ({ title: f.title, subtitle: f.subtitle ?? '' })),
    image: doc.image ?? '',
    imageAlt: doc.imageAlt ?? '',
    status: doc.status,
  };
}
