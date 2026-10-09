import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../../lib/actor';
import { NotFoundError } from '../../../../../lib/errors';
import {
  HOW_IT_WORKS_SECTION_DEFAULTS, HOW_IT_WORKS_SECTION_KEY, HOW_IT_WORKS_STEP_DEFAULTS, HowItWorksSectionModel, HowItWorksStepModel,
} from './howItWorks.model';
import { CreateHowItWorksStepInput, UpdateHowItWorksSectionInput, UpdateHowItWorksStepInput } from './howItWorks.validation';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// First admin open creates the heading and the website's current four steps,
// so the admin page starts filled in. Runs once (tracked by `seeded`).
async function ensureSeeded() {
  const section = await HowItWorksSectionModel.findOneAndUpdate(
    { key: HOW_IT_WORKS_SECTION_KEY },
    { $setOnInsert: { key: HOW_IT_WORKS_SECTION_KEY, ...HOW_IT_WORKS_SECTION_DEFAULTS, seeded: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  // Claim the seeding atomically so two first opens can't both insert.
  const claimed = await HowItWorksSectionModel.findOneAndUpdate({ _id: section._id, seeded: false }, { $set: { seeded: true } }, { new: true });
  if (claimed && (await HowItWorksStepModel.estimatedDocumentCount()) === 0) {
    await HowItWorksStepModel.insertMany(HOW_IT_WORKS_STEP_DEFAULTS.map((s) => ({ ...s })));
  }
}

export async function getAdminHowItWorks() {
  await ensureSeeded();
  const [section, steps] = await Promise.all([
    HowItWorksSectionModel.findOne({ key: HOW_IT_WORKS_SECTION_KEY }).select('-key -__v -seeded').lean(),
    HowItWorksStepModel.find().sort(SORT).select('-__v').lean(),
  ]);
  return { section, steps };
}

// Before the admin page is first opened, the website keeps showing defaults.
export async function getPublicHowItWorks() {
  const section = await HowItWorksSectionModel.findOne({ key: HOW_IT_WORKS_SECTION_KEY })
    .select('eyebrow heading highlight description seeded')
    .lean();
  if (!section?.seeded) {
    return {
      section: HOW_IT_WORKS_SECTION_DEFAULTS,
      steps: HOW_IT_WORKS_STEP_DEFAULTS.map(({ status: _s, ...s }, i) => ({ _id: `default-${i}`, ...s })),
    };
  }
  const steps = await HowItWorksStepModel.find({ status: 'ACTIVE' }).sort(SORT).select('title description image imageAlt icon sortOrder').lean();
  const { eyebrow, heading, highlight, description } = section;
  return { section: { eyebrow, heading, highlight, description }, steps };
}

export async function updateHowItWorksSection(data: UpdateHowItWorksSectionInput, actor: ActorSnapshot) {
  await ensureSeeded();
  return HowItWorksSectionModel.findOneAndUpdate(
    { key: HOW_IT_WORKS_SECTION_KEY },
    { $set: { ...data, updatedBy: actor } },
    { new: true, runValidators: true }
  )
    .select('-key -__v -seeded')
    .lean();
}

export async function createHowItWorksStep(data: CreateHowItWorksStepInput, actor: ActorSnapshot) {
  await ensureSeeded();
  const created = await HowItWorksStepModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Step not found');
}

export async function updateHowItWorksStep(id: string, data: UpdateHowItWorksStepInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await HowItWorksStepModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Step not found');
  return updated;
}

export async function deleteHowItWorksStep(id: string) {
  assertId(id);
  const deleted = await HowItWorksStepModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Step not found');
}
