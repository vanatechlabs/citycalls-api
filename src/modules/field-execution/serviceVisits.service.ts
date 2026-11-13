import mongoose, { ClientSession } from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../../lib/errors';
import { logActivity } from '../../lib/auditLog';
import { trigger } from '../../lib/notifications';
import { emitServiceRequestStatusChanged } from '../../realtime';
import { FileModel } from '../files/files.model';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { ConflictError } from '../../lib/errors';
import { updateInspectionSchema, addPartsSchema, updateWorkSchema, completeVisitSchema } from './serviceVisits.validation';
import { changeStatusSchema } from '../service-requests/serviceRequests.validation';
import crypto from 'crypto';
import { ServiceVisitModel, IServiceVisit } from './serviceVisits.model';
import { SyncedActionModel } from './syncedActions.model';
import { NotFoundError, InvalidTransitionError } from '../../lib/errors';
import { updateStatus, getServiceRequest, allowedNextStatuses } from '../service-requests/serviceRequests.service';
import { emitTechnicianLocationUpdated } from '../../realtime';
import { AccessTokenPayload } from '../../lib/jwt';
import { ServiceRequestStatus } from '../service-requests/serviceRequests.model';

export async function getVisitsForServiceRequest(serviceRequestId: string) {
  return ServiceVisitModel.find({ serviceRequestId }).sort({ visitNumber: 1 });
}

// Finds the technician's current in-progress visit for this Service Request,
// or starts a new one — a Service Request may span multiple visits (docs/09
// §2), each its own document rather than an array field.
async function getOrStartVisit(serviceRequestId: string, technicianId: string, session?: ClientSession): Promise<IServiceVisit> {
  const open = await ServiceVisitModel.findOne({
    serviceRequestId,
    technicianId,
    completedAt: { $exists: false },
  }).sort({ visitNumber: -1 }).session(session ?? null);
  if (open) return open;

  const lastVisit = await ServiceVisitModel.findOne({ serviceRequestId }).sort({ visitNumber: -1 }).session(session ?? null);
  const visitNumber = (lastVisit?.visitNumber ?? 0) + 1;

  const [visit] = await ServiceVisitModel.create([{
    serviceRequestId,
    visitNumber,
    technicianId,
    startedAt: new Date(),
  }], { session });
  return visit;
}

export async function startVisit(serviceRequestId: string, technicianId: string, session?: ClientSession) {
  return getOrStartVisit(serviceRequestId, technicianId, session);
}

export async function markArrived(serviceRequestId: string, technicianId: string, geo?: { lat: number; lng: number }, session?: ClientSession) {
  const visit = await getOrStartVisit(serviceRequestId, technicianId, session);
  visit.arrivedAt = new Date();
  await visit.save({ session });

  if (geo && !session) {
    emitTechnicianLocationUpdated(serviceRequestId, { serviceRequestId, geo, at: visit.arrivedAt });
  }
  return visit;
}

export async function updateInspection(serviceRequestId: string, technicianId: string, data: Record<string, unknown>, session?: ClientSession) {
  const visit = await getOrStartVisit(serviceRequestId, technicianId, session);
  visit.inspection = { ...visit.inspection, ...data };
  await visit.save({ session });
  return visit;
}

export async function addParts(serviceRequestId: string, technicianId: string, parts: IServiceVisit['parts'], session?: ClientSession) {
  const visit = await getOrStartVisit(serviceRequestId, technicianId, session);
  visit.parts.push(...parts);
  await visit.save({ session });
  return visit;
}

export async function updateWork(serviceRequestId: string, technicianId: string, data: Record<string, unknown>, session?: ClientSession) {
  for (const [field, category] of [['beforeImages', 'BEFORE_SERVICE_IMAGE'], ['afterImages', 'AFTER_SERVICE_IMAGE']] as const) {
    if (!Array.isArray(data[field])) continue;
    const urls = [...new Set(data[field] as string[])];
    const uploaded = await FileModel.countDocuments({ entityType: 'SERVICE_REQUEST', entityId: serviceRequestId, category, url: { $in: urls }, deletedAt: { $exists: false } }).session(session ?? null);
    if (uploaded !== urls.length) throw new ConflictError('Upload service photos against this job before attaching them', 'PHOTO_UPLOAD_REQUIRED');
  }
  const visit = await getOrStartVisit(serviceRequestId, technicianId, session);
  if (Array.isArray(data.checklist)) visit.checklist = data.checklist as string[];
  const job = await ServiceRequestModel.findById(serviceRequestId).session(session ?? null);
  if (job?.bookingPrice && job.bookingPrice.mode !== 'ESTIMATE' && data.labourCharge !== undefined) throw new ConflictError('Booked labour price cannot be changed; request an approved extra estimate', 'PRICE_LOCKED');
  if (data.labourCharge !== undefined) visit.labourCharge = data.labourCharge as number;
  if (data.workNotes !== undefined) visit.workNotes = data.workNotes as string;
  if (Array.isArray(data.beforeImages)) visit.beforeImages = [...new Set([...visit.beforeImages, ...(data.beforeImages as string[])])];
  if (Array.isArray(data.afterImages)) visit.afterImages = [...new Set([...visit.afterImages, ...(data.afterImages as string[])])];
  if (data.nextVisitDate !== undefined) visit.nextVisitDate = data.nextVisitDate as Date;
  await visit.save({ session });
  return visit;
}

export async function completeVisit(serviceRequestId: string, technicianId: string, completionProof: IServiceVisit['completionProof'], session?: ClientSession) {
  const sr = await ServiceRequestModel.findById(serviceRequestId).session(session ?? null);
  if (!sr || !['WORK_STARTED', 'WORK_IN_PROGRESS'].includes(sr.status)) throw new ConflictError('Start work before completing the visit', 'WORK_NOT_STARTED');
  if (completionProof?.type === 'OTP' && (!sr.completionVerifiedAt || Date.now() - sr.completionVerifiedAt.getTime() > 600000)) throw new ConflictError('Verify the customer OTP first', 'OTP_NOT_VERIFIED');
  if (completionProof?.type !== 'OTP' && (completionProof?.type !== 'SIGNATURE' || !completionProof.url)) throw new ConflictError('Customer OTP or signature is required', 'PROOF_REQUIRED');
  if (completionProof?.type === 'SIGNATURE' && !await FileModel.exists({ entityType: 'SERVICE_REQUEST', entityId: serviceRequestId, category: 'SIGNATURE', url: completionProof.url, deletedAt: { $exists: false } })) throw new ConflictError('Upload the customer signature for this job', 'SIGNATURE_REQUIRED');
  const previous = await ServiceVisitModel.findOne({ serviceRequestId, technicianId, completedAt: { $exists: true } }).sort({ completedAt: -1 });
  if (previous && previous.completedAt && Date.now() - previous.completedAt.getTime() < 60000) return previous;
  const visit = await getOrStartVisit(serviceRequestId, technicianId, session);
  visit.completedAt = new Date();
  visit.completionProof = { type: completionProof!.type, url: completionProof!.url };
  await visit.save({ session });
  return visit;
}

interface SyncAction {
  idempotencyKey: string;
  clientTimestamp: Date;
  actionType: string;
  payload: Record<string, unknown>;
}

interface SyncActionResult {
  idempotencyKey: string;
  actionType: string;
  status: 'APPLIED' | 'REJECTED' | 'REPLAYED';
  message: string;
  currentStatus?: ServiceRequestStatus;
  allowedTransitions?: string[];
}

async function applyAction(serviceRequestId: string, actor: AccessTokenPayload, action: SyncAction, session?: ClientSession): Promise<string> {
  const schemas: Record<string, { parse(input: unknown): unknown }> = { UPDATE_INSPECTION: updateInspectionSchema, ADD_PARTS: addPartsSchema, UPDATE_WORK: updateWorkSchema, COMPLETE_VISIT: completeVisitSchema, STATUS_CHANGE: changeStatusSchema };
  if (schemas[action.actionType]) action.payload = schemas[action.actionType].parse(action.payload) as Record<string, unknown>;
  switch (action.actionType) {
    case 'START_VISIT':
      await startVisit(serviceRequestId, actor.sub, session);
      return 'Visit started';
    case 'ARRIVE':
      await markArrived(serviceRequestId, actor.sub, action.payload.geo as { lat: number; lng: number } | undefined, session);
      return 'Marked arrived';
    case 'UPDATE_INSPECTION':
      await updateInspection(serviceRequestId, actor.sub, action.payload, session);
      return 'Inspection updated';
    case 'ADD_PARTS':
      await addParts(serviceRequestId, actor.sub, action.payload.parts as IServiceVisit['parts'], session);
      return 'Parts added';
    case 'UPDATE_WORK':
      await updateWork(serviceRequestId, actor.sub, action.payload, session);
      return 'Work updated';
    case 'COMPLETE_VISIT':
      await completeVisit(serviceRequestId, actor.sub, action.payload.completionProof as IServiceVisit['completionProof'], session);
      return 'Visit completed';
    case 'STATUS_CHANGE':
      await updateStatus(serviceRequestId, action.payload.toStatus as ServiceRequestStatus, actor, {
        reason: action.payload.reason as string | undefined,
        geo: action.payload.geo as { lat: number; lng: number } | undefined,
      }, session);
      return `Status changed to ${action.payload.toStatus}`;
    default:
      throw new Error(`Unknown action type: ${action.actionType}`);
  }
}

// Processes a batch of offline-queued actions in client-recorded order, each
// independently — a stale/invalid action is rejected on its own, not the whole
// batch, per docs/manish/09-vendor-app-functional-plan.md §2 and
// docs/18-error-handling-standards.md §7. Idempotency keys prevent a retried
// batch (e.g. after a dropped connection mid-sync) from double-applying
// already-processed actions.
export async function processSyncBatch(serviceRequestId: string, actions: SyncAction[], actor: AccessTokenPayload): Promise<SyncActionResult[]> {
  const ordered = [...actions].sort((a, b) => a.clientTimestamp.getTime() - b.clientTimestamp.getTime());
  const results: SyncActionResult[] = [];

  for (const action of ordered) {
    const existing = await SyncedActionModel.findOne({ idempotencyKey: action.idempotencyKey });
    if (existing) {
      results.push({
        idempotencyKey: action.idempotencyKey,
        actionType: action.actionType,
        status: existing.status === 'REJECTED' || existing.serviceRequestId.toString() !== serviceRequestId ? 'REJECTED' : 'REPLAYED',
        message: existing.resultSummary,
      });
      continue;
    }

    try {
      const session = await mongoose.startSession();
      let replayRejected = false;
      let applied = false;
      let message = '';
      let fromStatus: ServiceRequestStatus | undefined;
      try { await session.withTransaction(async () => {
        applied = false;
        const locked = await ServiceRequestModel.findOneAndUpdate({ _id: serviceRequestId }, { $inc: { executionVersion: 1 } }, { new: true, session });
        if (!locked) throw new NotFoundError('Service request not found');
        fromStatus = locked.status;
        const replay = await SyncedActionModel.findOne({ idempotencyKey: action.idempotencyKey }).session(session);
        if (replay) { replayRejected = replay.status === 'REJECTED' || replay.serviceRequestId.toString() !== serviceRequestId || replay.actionType !== action.actionType; message = replayRejected ? 'Action was rejected or the retry key belongs to another action' : replay.resultSummary; return; }
        message = await applyAction(serviceRequestId, actor, action, session);
        await SyncedActionModel.create([{ idempotencyKey: action.idempotencyKey, serviceRequestId, actionType: action.actionType, status: 'APPLIED', resultSummary: message }], { session });
        applied = true;
      }); } finally { await session.endSession(); }
      results.push({ idempotencyKey: action.idempotencyKey, actionType: action.actionType, status: applied ? 'APPLIED' : replayRejected ? 'REJECTED' : 'REPLAYED', message });
      if (applied && action.actionType === 'STATUS_CHANGE') {
        const toStatus = action.payload.toStatus as ServiceRequestStatus;
        emitServiceRequestStatusChanged(serviceRequestId, { serviceRequestId, fromStatus: fromStatus!, toStatus });
        await logActivity({ entityType: 'SERVICE_REQUEST', entityId: serviceRequestId, user: actor, action: 'STATUS_CHANGED', module: 'service-requests', oldValue: { status: fromStatus }, newValue: { status: toStatus } }).catch(error => console.error('[sync] status audit failed', error));
        const job = await ServiceRequestModel.findById(serviceRequestId);
        if (job) await trigger(`SERVICE_REQUEST_${toStatus}`, { recipient: { customerId: job.customerId.toString() }, variables: { serviceRequestId, number: job.number, status: toStatus } }).catch(error => console.error('[sync] status notification failed', error));
      }
    } catch (err) {
      if (!(err instanceof AppError) && !(err instanceof ZodError)) throw err;
      const message = err instanceof Error ? err.message : 'Unknown error';
      const result: SyncActionResult = {
        idempotencyKey: action.idempotencyKey,
        actionType: action.actionType,
        status: 'REJECTED',
        message,
      };

      if (err instanceof InvalidTransitionError) {
        const sr = await getServiceRequest(serviceRequestId);
        result.currentStatus = sr.status;
        result.allowedTransitions = allowedNextStatuses(sr.status);
      }

      await SyncedActionModel.findOneAndUpdate({ idempotencyKey: action.idempotencyKey }, { $setOnInsert: {
        idempotencyKey: action.idempotencyKey,
        serviceRequestId,
        actionType: action.actionType,
        status: 'REJECTED',
        resultSummary: message,
      } }, { upsert: true, new: true });
      results.push(result);
    }
  }

  return results;
}

export async function getVisit(id: string) {
  const visit = await ServiceVisitModel.findById(id);
  if (!visit) throw new NotFoundError('Service visit not found');
  return visit;
}

// Deterministic idempotency key for a non-batch (direct) action, so the same
// direct-call convention as the sync batch can be reused if ever needed.
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
