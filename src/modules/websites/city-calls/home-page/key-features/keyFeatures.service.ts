import { Types } from 'mongoose';
import { ActorSnapshot } from '../../../../../lib/actor';
import { NotFoundError } from '../../../../../lib/errors';
import {
  KEY_FEATURE_DEFAULTS, KEY_FEATURES_SECTION_DEFAULTS, KEY_FEATURES_SECTION_KEY, KeyFeatureModel, KeyFeaturesSectionModel,
} from './keyFeatures.model';
import { CreateKeyFeatureInput, UpdateKeyFeatureInput, UpdateKeyFeaturesSectionInput } from './keyFeatures.validation';

const SORT = { sortOrder: 1, createdAt: 1 } as const;

// First admin open creates the heading and the website's current six cards,
// so the admin page starts filled in. Runs once (tracked by `seeded`).
async function ensureSeeded() {
  const section = await KeyFeaturesSectionModel.findOneAndUpdate(
    { key: KEY_FEATURES_SECTION_KEY },
    { $setOnInsert: { key: KEY_FEATURES_SECTION_KEY, ...KEY_FEATURES_SECTION_DEFAULTS, seeded: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  // Claim the seeding atomically so two first opens can't both insert.
  const claimed = await KeyFeaturesSectionModel.findOneAndUpdate({ _id: section._id, seeded: false }, { $set: { seeded: true } }, { new: true });
  if (claimed && (await KeyFeatureModel.estimatedDocumentCount()) === 0) {
    await KeyFeatureModel.insertMany(KEY_FEATURE_DEFAULTS.map((f) => ({ ...f })));
  }
}

export async function getAdminKeyFeatures() {
  await ensureSeeded();
  const [section, features] = await Promise.all([
    KeyFeaturesSectionModel.findOne({ key: KEY_FEATURES_SECTION_KEY }).select('-key -__v -seeded').lean(),
    KeyFeatureModel.find().sort(SORT).select('-__v').lean(),
  ]);
  return { section, features };
}

// Before the admin page is first opened, the website keeps showing defaults.
export async function getPublicKeyFeatures() {
  const section = await KeyFeaturesSectionModel.findOne({ key: KEY_FEATURES_SECTION_KEY })
    .select('eyebrow heading highlight description seeded')
    .lean();
  if (!section?.seeded) {
    return {
      section: KEY_FEATURES_SECTION_DEFAULTS,
      features: KEY_FEATURE_DEFAULTS.map(({ status: _s, ...f }, i) => ({ _id: `default-${i}`, ...f })),
    };
  }
  const features = await KeyFeatureModel.find({ status: 'ACTIVE' }).sort(SORT).select('title description icon sortOrder').lean();
  const { eyebrow, heading, highlight, description } = section;
  return { section: { eyebrow, heading, highlight, description }, features };
}

export async function updateKeyFeaturesSection(data: UpdateKeyFeaturesSectionInput, actor: ActorSnapshot) {
  await ensureSeeded();
  return KeyFeaturesSectionModel.findOneAndUpdate(
    { key: KEY_FEATURES_SECTION_KEY },
    { $set: { ...data, updatedBy: actor } },
    { new: true, runValidators: true }
  )
    .select('-key -__v -seeded')
    .lean();
}

export async function createKeyFeature(data: CreateKeyFeatureInput, actor: ActorSnapshot) {
  await ensureSeeded();
  const created = await KeyFeatureModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Feature not found');
}

export async function updateKeyFeature(id: string, data: UpdateKeyFeatureInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await KeyFeatureModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Feature not found');
  return updated;
}

export async function deleteKeyFeature(id: string) {
  assertId(id);
  const deleted = await KeyFeatureModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Feature not found');
}
