import { ActorSnapshot } from '../../../../../lib/actor';
import { cloneFeaturesDefaults, FEATURES_KEY, FeaturesModel } from './features.model';
import { UpdateFeaturesInput } from './features.validation';

// Created with the website's current content on first open, so the admin
// form is never empty.
export async function getFeatures() {
  return FeaturesModel.findOneAndUpdate(
    { key: FEATURES_KEY },
    { $setOnInsert: { key: FEATURES_KEY, ...cloneFeaturesDefaults() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('-key -__v')
    .lean();
}

export async function getPublicFeatures() {
  const saved = await FeaturesModel.findOne({ key: FEATURES_KEY })
    .select('-_id -key -__v -updatedBy -createdAt -updatedAt')
    .lean();
  return saved ?? cloneFeaturesDefaults();
}

export async function updateFeatures(data: UpdateFeaturesInput, actor: ActorSnapshot) {
  return FeaturesModel.findOneAndUpdate(
    { key: FEATURES_KEY },
    { $set: { ...data, updatedBy: actor }, $setOnInsert: { key: FEATURES_KEY } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('-key -__v')
    .lean();
}
