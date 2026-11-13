import crypto from 'crypto';
import { approvedEstimateBill } from './estimateBilling';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { assertFinanceAccess, assertFinanceStaff, financeFilter } from './financeAccess';
import { ProformaInvoiceModel } from './proformaInvoices.model';
import { EstimateModel } from './estimates.model';
import * as estimatesService from './estimates.service';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/apiResponse';
import { getNextNumber, currentFinancialYear } from '../../lib/numbering';
import { assertValidTransition } from '../../lib/statusEngine';
import { generateDocumentPdf } from '../../lib/pdfGenerator';
import { trigger } from '../../lib/notifications';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';
import { DataScope } from '../users/users.types';

export async function convertEstimateToProforma(estimateId: string, actor: AccessTokenPayload) {
  assertFinanceStaff(actor);
  const selected = await EstimateModel.findById(estimateId);
  if (!selected) throw new NotFoundError('Estimate not found');
  await assertFinanceAccess(selected, actor);
  if (selected.serviceRequestId) return convertJobEstimates(selected.serviceRequestId.toString(), actor);
  const existing = await ProformaInvoiceModel.findOne({ estimateId });
  if (existing) { await assertFinanceAccess(existing, actor); await estimatesService.markConverted(estimateId, actor); return existing; }
  const estimate = await estimatesService.assertConvertible(estimateId);
  await assertFinanceAccess(estimate, actor);
  const job = estimate.serviceRequestId ? await ServiceRequestModel.findById(estimate.serviceRequestId) : null;
  if (job?.bookingPrice && job.bookingPrice.mode !== 'ESTIMATE') throw new ConflictError('Additional estimates are included in the booking invoice after approval', 'USE_BOOKING_INVOICE');

  const number = await getNextNumber('PROFORMA_INVOICE', estimate.branchId.toString());
  const proforma = await ProformaInvoiceModel.findOneAndUpdate({ estimateId }, { $setOnInsert: {
    number,
    serviceRequestId: estimate.serviceRequestId,
    leadId: estimate.leadId,
    customerId: estimate.customerId,
    branchId: estimate.branchId,
    financialYear: currentFinancialYear(),
    items: estimate.items,
    subtotal: estimate.subtotal,
    taxBreakup: estimate.taxBreakup,
    discount: estimate.discount,
    roundOff: estimate.roundOff,
    total: estimate.total,
    estimateId: estimate._id,
  } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });

  await estimatesService.markConverted(estimateId, actor);

  await logActivity({
    entityType: 'PROFORMA_INVOICE',
    entityId: proforma._id.toString(),
    user: actor,
    action: 'CREATED_FROM_ESTIMATE',
    module: 'finance',
    newValue: { estimateId, number },
  });

  return proforma;
}

export async function listProformaInvoices(
  params: { page: number; limit: number; status?: string; customerId?: string; serviceRequestId?: string },
  scope: DataScope,
  user: AccessTokenPayload
) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.customerId) filter.customerId = params.customerId;
  if (params.serviceRequestId) filter.serviceRequestId = params.serviceRequestId;
  if (scope === 'BRANCH' && user.branchId) filter.branchId = user.branchId;

  Object.assign(filter, await financeFilter(user));
  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    ProformaInvoiceModel.find(filter).skip(skip).limit(params.limit).sort({ createdAt: -1 }),
    ProformaInvoiceModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}

export async function getProformaInvoice(id: string, actor?: AccessTokenPayload) {
  const proforma = await ProformaInvoiceModel.findById(id);
  if (!proforma) throw new NotFoundError('Proforma invoice not found');
  await assertFinanceAccess(proforma, actor);
  return proforma;
}

export async function shareProformaInvoice(id: string, channels: string[], actor: AccessTokenPayload) {
  const proforma = await ProformaInvoiceModel.findById(id);
  if (!proforma) throw new NotFoundError('Proforma invoice not found');

  assertFinanceStaff(actor);
  await assertFinanceAccess(proforma, actor);
  assertValidTransition('PROFORMA_INVOICE', proforma.status, 'SHARED', actor.role);
  proforma.pdfUrl = await generateDocumentPdf('PROFORMA_INVOICE', id);
  proforma.status = 'SHARED';
  proforma.sentVia = channels;
  await proforma.save();

  await trigger('PROFORMA_INVOICE_SHARED', {
    recipient: { customerId: proforma.customerId.toString() },
    variables: { proformaInvoiceId: id, number: proforma.number },
  });

  return proforma;
}
export async function generateProformaFromServiceRequest(serviceRequestId: string, actor: AccessTokenPayload) {
  const existing = await ProformaInvoiceModel.findOne({ serviceRequestId, status: { $in: ['DRAFT', 'SHARED', 'ACCEPTED'] } }).sort({ createdAt: -1 });
  if (existing) { await assertFinanceAccess(existing, actor); return existing.status === 'DRAFT' ? shareProformaInvoice(existing.id, ['IN_APP'], actor) : existing; }

  const estimate = await EstimateModel.findOne({ serviceRequestId, status: { $in: ['APPROVED', 'CONVERTED'] } }).sort({ approvedAt: -1 });
  if (!estimate) {
    throw new NotFoundError('No approved estimate found for this service request');
  }

  const proforma = await convertEstimateToProforma(estimate._id.toString(), actor);
  return shareProformaInvoice(proforma._id.toString(), ['IN_APP'], actor);
}

export async function acceptProformaInvoice(id: string, actor: AccessTokenPayload) {
  const proforma = await ProformaInvoiceModel.findById(id);
  if (!proforma) throw new NotFoundError('Proforma invoice not found');

  await assertFinanceAccess(proforma, actor);
  assertValidTransition('PROFORMA_INVOICE', proforma.status, 'ACCEPTED', actor.role);
  proforma.status = 'ACCEPTED';
  proforma.approvedBy = actor.sub as never;
  proforma.approvedAt = new Date();
  await proforma.save();
  return proforma;
}

export async function assertConvertible(id: string) {
  const proforma = await ProformaInvoiceModel.findById(id);
  if (!proforma) throw new NotFoundError('Proforma invoice not found');
  if (proforma.status !== 'ACCEPTED') {
    throw new ConflictError('Only an accepted proforma invoice can be converted', 'PROFORMA_NOT_ACCEPTED');
  }
  return proforma;
}

export async function markConverted(id: string, actor: AccessTokenPayload) {
  const proforma = await ProformaInvoiceModel.findById(id);
  if (!proforma) throw new NotFoundError('Proforma invoice not found');
  if (proforma.status === 'CONVERTED') return;
  assertValidTransition('PROFORMA_INVOICE', proforma.status, 'CONVERTED', actor.role);
  proforma.status = 'CONVERTED';
  await proforma.save();
}

async function convertJobEstimates(serviceRequestId: string, actor: AccessTokenPayload) {
  const job = await ServiceRequestModel.findById(serviceRequestId);
  if (!job) throw new NotFoundError('Job not found');
  await assertFinanceAccess({ ...job.toObject(), serviceRequestId: job._id }, actor);
  if (job.bookingPrice && job.bookingPrice.mode !== 'ESTIMATE') throw new ConflictError('Use the booking invoice for this service', 'USE_BOOKING_INVOICE');
  const bill = await approvedEstimateBill(serviceRequestId);
  const billingKey = crypto.createHash('sha256').update(bill.estimateIds.map(id => id.toString()).sort().join(':')).digest('hex');
  const existing = await ProformaInvoiceModel.findOne({ billingKey });
  if (existing && existing.status !== 'CANCELLED') return existing;
  if (existing) return ProformaInvoiceModel.findOneAndUpdate({ _id: existing._id, status: 'CANCELLED' }, { $set: { status: 'DRAFT' }, $unset: { approvedBy: 1, approvedAt: 1, pdfUrl: 1 } }, { new: true }).orFail();
  const number = await getNextNumber('PROFORMA_INVOICE', job.branchId?.toString());
  const proforma = await ProformaInvoiceModel.findOneAndUpdate({ billingKey }, { $setOnInsert: { ...bill, billingKey, number, serviceRequestId: job._id, customerId: job.customerId, branchId: job.branchId, financialYear: currentFinancialYear(), status: 'DRAFT' } }, { upsert: true, new: true, runValidators: true });
  await EstimateModel.updateMany({ _id: { $in: bill.estimateIds }, status: 'APPROVED' }, { $set: { status: 'CONVERTED' } });
  return proforma;
}
