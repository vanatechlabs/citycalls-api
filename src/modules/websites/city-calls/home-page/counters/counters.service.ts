import { ActorSnapshot } from '../../../../../lib/actor';
import { cloneCountersDefaults, COUNTERS_KEY, CountersModel } from './counters.model';
import { UpdateCountersInput } from './counters.validation';

// Created with the website's current counters on first open, so the admin
// form is never empty.
export async function getCounters() {
  return CountersModel.findOneAndUpdate(
    { key: COUNTERS_KEY },
    { $setOnInsert: { key: COUNTERS_KEY, ...cloneCountersDefaults() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('-key -__v')
    .lean();
}

export async function getPublicCounters() {
  const saved = await CountersModel.findOne({ key: COUNTERS_KEY })
    .select('-_id -key -__v -updatedBy -createdAt -updatedAt')
    .lean();
  return saved ?? cloneCountersDefaults();
}

export async function updateCounters(data: UpdateCountersInput, actor: ActorSnapshot) {
  return CountersModel.findOneAndUpdate(
    { key: COUNTERS_KEY },
    { $set: { ...data, updatedBy: actor }, $setOnInsert: { key: COUNTERS_KEY } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
    .select('-key -__v')
    .lean();
}
