import {
  LAUNCH_SPOTLIGHT_DEFAULTS,
  LAUNCH_SPOTLIGHT_KEY,
  LaunchSpotlightModel,
  LaunchSpotlightSlide,
} from './launchSpotlight.model';

function cloneDefaults(): LaunchSpotlightSlide[] {
  return LAUNCH_SPOTLIGHT_DEFAULTS.map((slide) => ({ ...slide }));
}

export async function getLaunchSpotlight() {
  return LaunchSpotlightModel.findOneAndUpdate(
    { key: LAUNCH_SPOTLIGHT_KEY },
    { $setOnInsert: { key: LAUNCH_SPOTLIGHT_KEY, slides: cloneDefaults() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

export async function getPublicLaunchSpotlight() {
  const config = await LaunchSpotlightModel.findOne({ key: LAUNCH_SPOTLIGHT_KEY }).lean();
  const slides = config?.slides ?? cloneDefaults();

  return slides
    .filter((slide) => slide.status === 'ACTIVE')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ status: _status, ...slide }) => slide);
}

export async function updateLaunchSpotlight(slides: LaunchSpotlightSlide[]) {
  return LaunchSpotlightModel.findOneAndUpdate(
    { key: LAUNCH_SPOTLIGHT_KEY },
    { $set: { slides }, $setOnInsert: { key: LAUNCH_SPOTLIGHT_KEY } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}
