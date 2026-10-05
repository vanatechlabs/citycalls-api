import { Types } from 'mongoose';
import { ActorSnapshot } from '../../lib/actor';
import { NotFoundError } from '../../lib/errors';
import { ServerAssetModel, ServerAssetType } from './serverAsset.model';
import { CreateServerAssetInput, UpdateServerAssetInput } from './serverAssets.validation';

// Soonest expiry first — that's what needs attention.
export async function listServerAssets(type?: ServerAssetType) {
  return ServerAssetModel.find(type ? { type } : {}).sort({ expiresOn: 1 }).select('-__v').lean();
}

export async function createServerAsset(data: CreateServerAssetInput, actor: ActorSnapshot) {
  const created = await ServerAssetModel.create({ ...data, createdBy: actor, updatedBy: actor });
  return created.toObject();
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundError('Record not found');
}

export async function updateServerAsset(id: string, data: UpdateServerAssetInput, actor: ActorSnapshot) {
  assertId(id);
  const updated = await ServerAssetModel.findByIdAndUpdate(id, { $set: { ...data, updatedBy: actor } }, { new: true, runValidators: true })
    .select('-__v')
    .lean();
  if (!updated) throw new NotFoundError('Record not found');
  return updated;
}

export async function deleteServerAsset(id: string) {
  assertId(id);
  const deleted = await ServerAssetModel.findByIdAndDelete(id);
  if (!deleted) throw new NotFoundError('Record not found');
}
