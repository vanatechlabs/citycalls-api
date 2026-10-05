import { ActorSnapshot } from '../../../../../lib/actor';
import { ABOUT_KEY, AboutModel, cloneAboutDefaults } from './about.model';
import { UpdateAboutInput } from './about.validation';

// Created with the website's current content on first open, so the admin
// form is never empty.
export async function getAbout() {
  return AboutModel.findOneAndUpdate(
    { key: ABOUT_KEY },
    { $setOnInsert: { key: ABOUT_KEY, ...cloneAboutDefaults() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('-key -__v')
    .lean();
}

export async function getPublicAbout() {
  const saved = await AboutModel.findOne({ key: ABOUT_KEY })
    .select('-_id -key -__v -updatedBy -createdAt -updatedAt')
    .lean();
  return saved ?? cloneAboutDefaults();
}

export async function updateAbout(data: UpdateAboutInput, actor: ActorSnapshot) {
  return AboutModel.findOneAndUpdate(
    { key: ABOUT_KEY },
    { $set: { ...data, updatedBy: actor }, $setOnInsert: { key: ABOUT_KEY } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('-key -__v')
    .lean();
}
