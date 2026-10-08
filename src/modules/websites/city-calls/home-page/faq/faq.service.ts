import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../../lib/actor';
import { NotFoundError } from '../../../../../lib/errors';
import { FAQ_DEFAULTS, FAQ_SECTION_DEFAULTS, FAQ_SECTION_KEY, FaqModel, FaqSectionModel } from './faq.model';
import { CreateFaqInput, UpdateFaqInput, UpdateFaqSectionInput } from './faq.validation';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// First admin open creates the headings and the website's current questions,
// so the admin page starts filled in. Runs once (tracked by `seeded`).
async function ensureSeeded() {
  const section = await FaqSectionModel.findOneAndUpdate(
    { key: FAQ_SECTION_KEY },
    { $setOnInsert: { key: FAQ_SECTION_KEY, ...FAQ_SECTION_DEFAULTS, seeded: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  // Claim the seeding atomically so two first opens can't both insert.
  const claimed = await FaqSectionModel.findOneAndUpdate({ _id: section._id, seeded: false }, { $set: { seeded: true } }, { new: true });
  if (claimed && (await FaqModel.estimatedDocumentCount()) === 0) {
    await FaqModel.insertMany(FAQ_DEFAULTS.map((f) => ({ ...f })));
  }
}

export async function getAdminFaqs() {
  await ensureSeeded();
  const [section, faqs] = await Promise.all([
    FaqSectionModel.findOne({ key: FAQ_SECTION_KEY }).select('-key -__v -seeded').lean(),
    FaqModel.find().sort(SORT).select('-__v').lean(),
  ]);
  return { section, faqs };
}

// Before the admin page is first opened, the website keeps showing defaults.
export async function getPublicFaqs() {
  const section = await FaqSectionModel.findOne({ key: FAQ_SECTION_KEY }).select('subheading heading highlightedWord description seeded').lean();
  if (!section?.seeded) {
    return { section: FAQ_SECTION_DEFAULTS, faqs: FAQ_DEFAULTS.map(({ status: _s, ...f }, i) => ({ _id: `default-${i}`, ...f })) };
  }
  const faqs = await FaqModel.find({ status: 'ACTIVE' }).sort(SORT).select('question answer image altText sortOrder').lean();
  const { subheading, heading, highlightedWord, description } = section;
  return { section: { subheading, heading, highlightedWord, description }, faqs };
}

export async function updateFaqSection(data: UpdateFaqSectionInput, actor: ActorSnapshot) {
  await ensureSeeded();
  return FaqSectionModel.findOneAndUpdate({ key: FAQ_SECTION_KEY }, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-key -__v -seeded')
    .lean();
}

export async function createFaq(data: CreateFaqInput, actor: ActorSnapshot) {
  await ensureSeeded();
  const created = await FaqModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('FAQ not found');
}

export async function updateFaq(id: string, data: UpdateFaqInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await FaqModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true }).select('-__v').lean();
  if (!updated) throw new NotFoundError('FAQ not found');
  return updated;
}

export async function deleteFaq(id: string) {
  assertId(id);
  const deleted = await FaqModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('FAQ not found');
}
