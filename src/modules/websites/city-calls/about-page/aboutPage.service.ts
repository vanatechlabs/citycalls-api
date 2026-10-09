import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../lib/actor';
import { NotFoundError } from '../../../../lib/errors';
import {
  ABOUT_HERO_DEFAULTS, ABOUT_JOURNEY_SECTION_DEFAULTS, ABOUT_MILESTONE_DEFAULTS, ABOUT_PAGE_KEY, ABOUT_PARALLAX_DEFAULTS,
  ABOUT_STORY_DEFAULTS, ABOUT_VALUE_DEFAULTS, ABOUT_VALUES_SECTION_DEFAULTS, AboutMilestoneModel, AboutPageModel, AboutValueModel,
} from './aboutPage.model';
import {
  CreateAboutMilestoneInput, CreateAboutValueInput, UpdateAboutHeroInput, UpdateAboutListHeadingInput, UpdateAboutMilestoneInput,
  UpdateAboutParallaxInput, UpdateAboutStoryInput, UpdateAboutValueInput,
} from './aboutPage.validation';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// The single-block sections and what the website showed before each was editable.
const BLOCK_DEFAULTS = {
  hero: ABOUT_HERO_DEFAULTS,
  story: ABOUT_STORY_DEFAULTS,
  parallax: ABOUT_PARALLAX_DEFAULTS,
  valuesSection: ABOUT_VALUES_SECTION_DEFAULTS,
  journeySection: ABOUT_JOURNEY_SECTION_DEFAULTS,
};
type Block = keyof typeof BLOCK_DEFAULTS;

// First admin open creates the page document with the website's current
// content, so every admin screen starts filled in.
async function ensurePage() {
  return AboutPageModel.findOneAndUpdate(
    { key: ABOUT_PAGE_KEY },
    { $setOnInsert: { key: ABOUT_PAGE_KEY, ...BLOCK_DEFAULTS, valuesSeeded: false, journeySeeded: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
}

// Creates the default value cards / milestones once (claimed atomically so
// two first opens can't both insert).
async function ensureValuesSeeded() {
  const page = await ensurePage();
  const claimed = await AboutPageModel.findOneAndUpdate({ _id: page._id, valuesSeeded: false }, { $set: { valuesSeeded: true } }, { new: true });
  if (claimed && (await AboutValueModel.estimatedDocumentCount()) === 0) {
    await AboutValueModel.insertMany(ABOUT_VALUE_DEFAULTS.map((v) => ({ ...v })));
  }
}

async function ensureJourneySeeded() {
  const page = await ensurePage();
  const claimed = await AboutPageModel.findOneAndUpdate({ _id: page._id, journeySeeded: false }, { $set: { journeySeeded: true } }, { new: true });
  if (claimed && (await AboutMilestoneModel.estimatedDocumentCount()) === 0) {
    await AboutMilestoneModel.insertMany(ABOUT_MILESTONE_DEFAULTS.map((m) => ({ ...m })));
  }
}

// ─── Single-block sections (admin) ─────────────────────────────────────────
export async function getBlock<B extends Block>(block: B) {
  const page = await ensurePage();
  return { ...BLOCK_DEFAULTS[block], ...(page[block] ?? {}) };
}

async function saveBlock<B extends Block>(block: B, data: object, actor: ActorSnapshot) {
  await ensurePage();
  const page = await AboutPageModel.findOneAndUpdate(
    { key: ABOUT_PAGE_KEY },
    { $set: { [block]: { ...data, updatedBy: actor, updatedAt: new Date() } } },
    { new: true, runValidators: true }
  ).lean();
  return { ...BLOCK_DEFAULTS[block], ...(page?.[block] ?? {}) };
}

export const updateHero = (data: UpdateAboutHeroInput, actor: ActorSnapshot) => saveBlock('hero', data, actor);
export const updateStory = (data: UpdateAboutStoryInput, actor: ActorSnapshot) => saveBlock('story', data, actor);
export const updateParallax = (data: UpdateAboutParallaxInput, actor: ActorSnapshot) => saveBlock('parallax', data, actor);
export const updateValuesSection = (data: UpdateAboutListHeadingInput, actor: ActorSnapshot) => saveBlock('valuesSection', data, actor);
export const updateJourneySection = (data: UpdateAboutListHeadingInput, actor: ActorSnapshot) => saveBlock('journeySection', data, actor);

// ─── Value cards (admin) ───────────────────────────────────────────────────
export async function getAdminValues() {
  await ensureValuesSeeded();
  const [section, values] = await Promise.all([getBlock('valuesSection'), AboutValueModel.find().sort(SORT).select('-__v').lean()]);
  return { section, values };
}

export async function createValue(data: CreateAboutValueInput, actor: ActorSnapshot) {
  await ensureValuesSeeded();
  const created = await AboutValueModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string, label: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError(`${label} not found`);
}

export async function updateValue(id: string, data: UpdateAboutValueInput, actor: ActorSnapshot) {
  assertId(id, 'Value');
  const updated = await AboutValueModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Value not found');
  return updated;
}

export async function deleteValue(id: string) {
  assertId(id, 'Value');
  const deleted = await AboutValueModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Value not found');
}

// ─── Journey milestones (admin) ────────────────────────────────────────────
export async function getAdminJourney() {
  await ensureJourneySeeded();
  const [section, milestones] = await Promise.all([getBlock('journeySection'), AboutMilestoneModel.find().sort(SORT).select('-__v').lean()]);
  return { section, milestones };
}

export async function createMilestone(data: CreateAboutMilestoneInput, actor: ActorSnapshot) {
  await ensureJourneySeeded();
  const created = await AboutMilestoneModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

export async function updateMilestone(id: string, data: UpdateAboutMilestoneInput, actor: ActorSnapshot) {
  assertId(id, 'Milestone');
  const updated = await AboutMilestoneModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Milestone not found');
  return updated;
}

export async function deleteMilestone(id: string) {
  assertId(id, 'Milestone');
  const deleted = await AboutMilestoneModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Milestone not found');
}

// ─── Website ───────────────────────────────────────────────────────────────
// Content only — who saved it and when stays in admin.
function publicBlock<B extends Block>(block: B, saved: object | undefined) {
  const { updatedBy: _by, updatedAt: _at, ...content } = { ...BLOCK_DEFAULTS[block], ...(saved ?? {}) } as Record<string, unknown>;
  return content as unknown as (typeof BLOCK_DEFAULTS)[B];
}

// The whole /about page in one call. Anything not set up in admin yet shows
// the website's original content.
export async function getPublicAboutPage() {
  const page = await AboutPageModel.findOne({ key: ABOUT_PAGE_KEY }).lean();
  const [values, milestones] = await Promise.all([
    page?.valuesSeeded
      ? AboutValueModel.find({ status: 'ACTIVE' }).sort(SORT).select('title description icon sortOrder').lean()
      : ABOUT_VALUE_DEFAULTS.map(({ status: _s, ...v }, i) => ({ _id: `default-${i}`, ...v })),
    page?.journeySeeded
      ? AboutMilestoneModel.find({ status: 'ACTIVE' }).sort(SORT).select('year title description tag icon image imageAlt sortOrder').lean()
      : ABOUT_MILESTONE_DEFAULTS.map(({ status: _s, ...m }, i) => ({ _id: `default-${i}`, ...m })),
  ]);
  return {
    hero: publicBlock('hero', page?.hero),
    story: publicBlock('story', page?.story),
    parallax: publicBlock('parallax', page?.parallax),
    values: { section: publicBlock('valuesSection', page?.valuesSection), items: values },
    journey: { section: publicBlock('journeySection', page?.journeySection), items: milestones },
  };
}
