import { ActorSnapshot } from '../../../../lib/actor';
import { getPublicHelpNowTestimonials } from '../../city-calls/home-page/testimonials/testimonials.service';
import { helpNowHomeDefault } from './helpNowHome.defaults';
import { HelpNowHomeSectionModel } from './helpNowHome.model';
import { HELP_NOW_HOME_SECTIONS, HelpNowHomeContent, HelpNowHomeSection } from './helpNowHome.validation';

type SectionDoc = { _id: unknown; content: Record<string, unknown>; updatedBy?: ActorSnapshot; updatedAt?: Date };

// Admin shape: the section's fields, plus who saved it last.
const toAdmin = (doc: SectionDoc) => ({ _id: doc._id, ...doc.content, updatedBy: doc.updatedBy, updatedAt: doc.updatedAt });

// Created with the website's current content on first open, so the admin
// form is never empty. Reading must not touch the document: an upsert bumps
// updatedAt, and the admin form resets (losing unsaved edits) when it changes.
export async function getHelpNowHomeSection(section: HelpNowHomeSection) {
  const existing = await HelpNowHomeSectionModel.findOne({ key: section }).lean();
  if (existing) return toAdmin(existing as SectionDoc);
  const doc = await HelpNowHomeSectionModel.findOneAndUpdate(
    { key: section },
    { $setOnInsert: { key: section, content: helpNowHomeDefault(section) } },
    { new: true, upsert: true }
  ).lean();
  return toAdmin(doc as SectionDoc);
}

export async function updateHelpNowHomeSection<K extends HelpNowHomeSection>(
  section: K,
  content: HelpNowHomeContent[K],
  actor: ActorSnapshot
) {
  const doc = await HelpNowHomeSectionModel.findOneAndUpdate(
    { key: section },
    { $set: { content, updatedBy: actor }, $setOnInsert: { key: section } },
    { new: true, upsert: true }
  ).lean();
  return toAdmin(doc as SectionDoc);
}

// Everything the website's home page needs in one call. Sections never saved
// fall back to the defaults; hidden ones come back as null, and only active
// hero slides are sent.
export async function getPublicHelpNowHome() {
  const [docs, testimonials] = await Promise.all([
    HelpNowHomeSectionModel.find().select('key content').lean(),
    // Admin → Pages Section → Testimonials, reviews marked Help Now.
    getPublicHelpNowTestimonials(),
  ]);
  const saved = new Map(docs.map((doc) => [doc.key, doc.content]));
  const content = Object.fromEntries(
    HELP_NOW_HOME_SECTIONS.map((section) => [section, saved.get(section) ?? helpNowHomeDefault(section)])
  ) as unknown as HelpNowHomeContent;

  const visible = <T extends { status: string }>(value: T) => (value.status === 'ACTIVE' ? value : null);
  return {
    hero: { slides: content.hero.slides.filter((slide) => slide.active) },
    marquee: visible(content.marquee),
    about: visible(content.about),
    services: visible(content.services),
    faq: content.faq.status === 'ACTIVE' ? { ...content.faq, items: content.faq.items.filter((item) => item.active) } : null,
    testimonials,
  };
}
