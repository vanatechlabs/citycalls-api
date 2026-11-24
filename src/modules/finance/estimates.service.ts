import { saveEstimateWithSync } from './estimateSync';
import { InvoiceModel } from './invoices.model';
import { ProformaInvoiceModel } from './proformaInvoices.model';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { assertFinanceAccess, assertFinanceStaff, financeFilter } from './financeAccess';
import { EstimateModel } from './estimates.model';
import { BranchModel } from '../organization/organization.model';
import { CustomerModel } from '../customers/customers.model';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/apiResponse';
import { getNextNumber, currentFinancialYear } from '../../lib/numbering';
import { computeDocumentTotals } from '../../lib/financialTotals';
import { assertValidTransition } from '../../lib/statusEngine';
import { generateDocumentPdf } from '../../lib/pdfGenerator';
import { trigger } from '../../lib/notifications';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';
import { DataScope } from '../users/users.types';
import { isCustomerRole, resolveOwnCustomerId } from '../../lib/ownCustomerScope';
import { restrictToOwnJobs } from '../../lib/ownFieldScope';

interface LineItemInput {
  description: string;
  partId?: string;
  qty: number;
  unitPrice: number;
  taxRateId?: string;
}

interface CreateEstimateInput {
  customerId: string;
  branchId: string;
  serviceRequestId?: string;
  leadId?: string;
  items: LineItemInput[];
  discount?: number;
  validUntil?: Date;
}
async function resolveGstStates(branchId: string, customerId: string): Promise<{ branchState: string; customerState: string }> {
  const [branch, customer] = await Promise.all([BranchModel.findById(branchId), CustomerModel.findById(customerId)]);
  const branchState = branch?.registeredAddress?.state ?? '';
  const customerAddress = customer?.addresses.find((a) => a.isDefault) ?? customer?.addresses[0];
  const customerState = customerAddress?.state ?? branchState; // no address on file -> assume intra-state rather than block document creation
  return { branchState, customerState };
}

export async function createEstimate(input: CreateEstimateInput, actor: AccessTokenPayload) {
  assertFinanceStaff(actor);
  await assertFinanceAccess(input, actor);
  let kind: 'PRIMARY' | 'ADDITIONAL' = 'PRIMARY';
  if (input.serviceRequestId) {
    const job = await ServiceRequestModel.findById(input.serviceRequestId);
    if (await InvoiceModel.exists({ serviceRequestId: input.serviceRequestId, status: { $ne: 'CANCELLED' } })) throw new ConflictError('Invoice already issued. Use a debit/credit note or a new request.', 'INVOICE_ALREADY_ISSUED');
    if (job && (['ESTIMATE_APPROVED', 'WORK_STARTED', 'WORK_IN_PROGRESS', 'ON_HOLD', 'PARTS_PENDING'].includes(job.status) || await EstimateModel.exists({ serviceRequestId: input.serviceRequestId, status: { $in: ['APPROVED', 'CONVERTED'] } }))) kind = 'ADDITIONAL';
    if (!job || job.customerId.toString() !== input.customerId || job.branchId?.toString() !== input.branchId) throw new ConflictError('Estimate must match the booked customer and branch', 'JOB_MISMATCH');
  }
  const { branchState, customerState } = await resolveGstStates(input.branchId, input.customerId);
  const totals = await computeDocumentTotals(input.items, input.discount ?? 0, branchState, customerState);

  const number = await getNextNumber('ESTIMATE', input.branchId);

  const estimate = new EstimateModel({
    kind,
    number,
    serviceRequestId: input.serviceRequestId,
    leadId: input.leadId,
    customerId: input.customerId,
    branchId: input.branchId,
    financialYear: currentFinancialYear(),
    items: totals.items,
    subtotal: totals.subtotal,
    taxBreakup: totals.taxBreakup,
    discount: input.discount ?? 0,
    roundOff: totals.roundOff,
    total: totals.total,
    validUntil: input.validUntil,
  });

  await saveEstimateWithSync(estimate, actor);
  if (input.serviceRequestId) await ProformaInvoiceModel.updateMany({ serviceRequestId: input.serviceRequestId, status: { $in: ['DRAFT', 'SHARED', 'ACCEPTED'] } }, { $set: { status: 'CANCELLED' } });
  await logActivity({
    entityType: 'ESTIMATE',
    entityId: estimate._id.toString(),
    user: actor,
    action: 'CREATED',
    module: 'finance',
    newValue: { number, total: totals.total },
  });


  return estimate;
}

export async function listEstimates(
  params: { page: number; limit: number; status?: string; customerId?: string; serviceRequestId?: string },
  scope: DataScope,
  user: AccessTokenPayload
) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.customerId) filter.customerId = params.customerId;
  if (params.serviceRequestId) filter.serviceRequestId = params.serviceRequestId;
  if (scope === 'BRANCH' && user.branchId) filter.branchId = user.branchId;
  if (scope === 'OWN' && isCustomerRole(user.role)) {
    const ownId = await resolveOwnCustomerId(user.sub);
    filter.customerId = ownId ?? null;
  }
  // Field technicians (OWN scope): only estimates on jobs assigned to them.
  await restrictToOwnJobs(filter, scope, user, params.serviceRequestId);

  Object.assign(filter, await financeFilter(user));
  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    EstimateModel.find(filter).skip(skip).limit(params.limit).sort({ createdAt: -1 }),
    EstimateModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}

export async function getEstimate(id: string, actor?: AccessTokenPayload) {
  const estimate = await EstimateModel.findById(id);
  if (!estimate) throw new NotFoundError('Estimate not found');
  await assertFinanceAccess(estimate, actor);
  return estimate;
}

// CUSTOMER/BUSINESS_CUSTOMER's finance.edit/view grant is always OWN scope
// (scripts/seed.ts) — no other scope value applies to those roles for this
// permission, so this doesn't need req.scope threaded through on top of the
// role check itself.

export async function shareEstimate(id: string, channels: string[], actor: AccessTokenPayload) {
  const estimate = await EstimateModel.findById(id);
  if (!estimate) throw new NotFoundError('Estimate not found');

  assertFinanceStaff(actor);
  await assertFinanceAccess(estimate, actor);
  if (estimate.status === 'SHARED') { await saveEstimateWithSync(estimate, actor); return estimate; }
  assertValidTransition('ESTIMATE', estimate.status, 'SHARED', actor.role);

  estimate.pdfUrl = await generateDocumentPdf('ESTIMATE', id);
  estimate.status = 'SHARED';
  estimate.sentVia = channels;
  await saveEstimateWithSync(estimate, actor);

  await trigger('ESTIMATE_SHARED', {
    recipient: { customerId: estimate.customerId.toString() },
    variables: { estimateId: id, number: estimate.number, total: estimate.total },
  });

  return estimate;
}

export async function respondToEstimate(id: string, approve: boolean, actor: AccessTokenPayload) {
  const estimate = await EstimateModel.findById(id);
  if (!estimate) throw new NotFoundError('Estimate not found');
  await assertFinanceAccess(estimate, actor);

  const toStatus = approve ? 'APPROVED' : 'REJECTED';
  if (estimate.status === toStatus) { await saveEstimateWithSync(estimate, actor); return estimate; }
  assertValidTransition('ESTIMATE', estimate.status, toStatus, actor.role);

  estimate.status = toStatus;
  if (approve) {
    estimate.approvedBy = actor.sub as never;
    estimate.approvedAt = new Date();
  }
  await saveEstimateWithSync(estimate, actor);

  await logActivity({
    entityType: 'ESTIMATE',
    entityId: id,
    user: actor,
    action: approve ? 'APPROVED' : 'REJECTED',
    module: 'finance',
  });


  return estimate;
}

// A rejected/expired Estimate never silently becomes usable data elsewhere —
// conversion is a distinct, auditable step (docs/16-pdf-and-financial-documents.md,
// conversion chain diagram).
export async function assertConvertible(id: string) {
  const estimate = await EstimateModel.findById(id);
  if (!estimate) throw new NotFoundError('Estimate not found');
  if (estimate.status !== 'APPROVED') {
    throw new ConflictError('Only an approved estimate can be converted', 'ESTIMATE_NOT_APPROVED');
  }
  return estimate;
}

export async function markConverted(id: string, actor: AccessTokenPayload) {
  const estimate = await EstimateModel.findById(id);
  if (!estimate) throw new NotFoundError('Estimate not found');
  if (estimate.status === 'CONVERTED') return;
  assertValidTransition('ESTIMATE', estimate.status, 'CONVERTED', actor.role);
  estimate.status = 'CONVERTED';
  await estimate.save();
}

export { resolveGstStates };
