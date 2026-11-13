import mongoose, { Schema, model } from 'mongoose';
import { EstimateModel, IEstimate } from './estimates.model';
import { ServiceRequestModel, ServiceRequestStatus } from '../service-requests/serviceRequests.model';
import { updateStatus } from '../service-requests/serviceRequests.service';
import { AccessTokenPayload } from '../../lib/jwt';

const syncSchema = new Schema({
  estimateId: { type: Schema.Types.ObjectId, required: true, unique: true },
  actor: { type: Schema.Types.Mixed, required: true },
  attempts: { type: Number, default: 0 }, nextAttemptAt: { type: Date, default: Date.now },
  lastError: String, completedAt: Date,
}, { timestamps: true });
export const EstimateSyncModel = model('EstimateStatusSync', syncSchema);

// The estimate and recovery intent commit together. A process restart cannot lose the intent.
export async function saveEstimateWithSync(estimate: IEstimate, actor: AccessTokenPayload) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await estimate.save({ session });
      if (estimate.serviceRequestId && estimate.kind !== 'ADDITIONAL') {
        await EstimateSyncModel.findOneAndUpdate({ estimateId: estimate._id }, {
          $set: { actor, attempts: 0, nextAttemptAt: new Date() }, $unset: { completedAt: 1, lastError: 1 },
        }, { upsert: true, session });
      }
    });
  } finally { await session.endSession(); }
  await recoverEstimateStatus(estimate._id.toString()).catch(error => console.error('[estimate-sync] deferred recovery', error));
}

export async function recoverEstimateStatus(estimateId: string) {
  const task = await EstimateSyncModel.findOne({ estimateId, completedAt: { $exists: false } });
  if (!task) return;
  try {
    const estimate = await EstimateModel.findById(estimateId);
    const job = estimate?.serviceRequestId ? await ServiceRequestModel.findById(estimate.serviceRequestId) : null;
    const stages: ServiceRequestStatus[] = ['ESTIMATE_PENDING', 'ESTIMATE_SHARED', 'AWAITING_CUSTOMER_APPROVAL'];
    const target = estimate?.status === 'DRAFT' ? 0 : estimate?.status === 'SHARED' ? 2 : 3;
    const alreadyExecuting = job && ['PARTS_PENDING', 'WORK_STARTED', 'WORK_IN_PROGRESS', 'ON_HOLD', 'SERVICE_COMPLETED', 'CUSTOMER_CONFIRMATION_PENDING', 'PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID', 'CLOSED', 'CANCELLED', 'REOPENED'].includes(job.status);
    if (estimate && estimate.status !== 'EXPIRED' && job && !alreadyExecuting && estimate.kind !== 'ADDITIONAL' && (!job.bookingPrice || job.bookingPrice.mode === 'ESTIMATE')) {
      if (estimate.status === 'APPROVED' || estimate.status === 'CONVERTED') stages.push('ESTIMATE_APPROVED');
      else if (estimate.status === 'REJECTED') stages.push('ESTIMATE_REJECTED');
      const current = stages.indexOf(job.status);
      // Recovery is based on an already-authorized document state, not client-supplied transitions.
      const actor = { ...(task.actor as AccessTokenPayload), role: 'SUPER_ADMIN' as const };
      for (let i = Math.max(0, current + 1); i <= Math.min(target, stages.length - 1); i++) {
        await updateStatus(job.id, stages[i], actor, { reason: `Automatic recovery from estimate ${estimate.number} (${estimate.status})` });
      }
    }
    await EstimateSyncModel.updateOne({ _id: task._id, updatedAt: task.updatedAt }, { $set: { completedAt: new Date() }, $unset: { lastError: 1 } });
  } catch (error) {
    const attempts = task.attempts + 1;
    await EstimateSyncModel.updateOne({ _id: task._id, updatedAt: task.updatedAt }, { $set: { lastError: error instanceof Error ? error.message : 'Recovery failed', nextAttemptAt: new Date(Date.now() + Math.min(300000, attempts * 15000)) }, $inc: { attempts: 1 } });
  }
}

export async function runEstimateRecovery() {
  const tasks = await EstimateSyncModel.find({ completedAt: { $exists: false }, nextAttemptAt: { $lte: new Date() } }).limit(50);
  for (const task of tasks) await recoverEstimateStatus(task.estimateId.toString());
}
