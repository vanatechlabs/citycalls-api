import mongoose from 'mongoose';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { InvoiceModel } from '../finance/invoices.model';
import { VendorInvoiceModel, VendorPayoutModel } from './vendorFinance.model';
import { VendorModel } from './vendors.model';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/apiResponse';
import { getNextNumber } from '../../lib/numbering';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';

interface CreateVendorInvoiceInput {
  vendorId: string;
  serviceRequestIds: string[];
  grossAmount: number;
  periodStart?: Date;
  periodEnd?: Date;
}

// Commission computed from the vendor's own configured commissionModel
// (docs/09-database-architecture.md §2 "vendors" schema) — a flat rate for v1;
// per-service commission tables are a documented extension point, not built yet.
export async function createVendorInvoice(input: CreateVendorInvoiceInput, actor: AccessTokenPayload) {
  const vendor = await VendorModel.findById(input.vendorId);
  if (!vendor) throw new NotFoundError('Vendor not found');


  const ids = [...new Set(input.serviceRequestIds)];
  if (!ids.length || ids.length !== input.serviceRequestIds.length) throw new ConflictError('Select distinct completed jobs', 'INVALID_JOBS');
  const jobs = await ServiceRequestModel.find({ _id: { $in: ids }, assigneeType: 'VENDOR', assigneeId: input.vendorId, status: { $in: ['PAID', 'CLOSED'] } });
  if (jobs.length !== ids.length) throw new ConflictError('All jobs must be paid and assigned to this vendor', 'INVALID_JOBS');
  if (await VendorInvoiceModel.exists({ serviceRequestIds: { $in: ids } })) throw new ConflictError('A selected job is already invoiced', 'JOBS_ALREADY_INVOICED');
  const bills = await InvoiceModel.find({ serviceRequestId: { $in: ids }, status: 'PAID' });
  if (!ids.every(id => bills.some(bill => bill.serviceRequestId?.toString() === id))) throw new ConflictError('Every job needs a paid invoice', 'PAID_INVOICE_REQUIRED');
  input.grossAmount = Math.round(bills.reduce((total, bill) => total + bill.total, 0) * 100) / 100;
  const commissionRate = vendor.commissionRate ?? 0;
  if (commissionRate < 0 || commissionRate > 100) throw new ConflictError('Invalid commission rate', 'INVALID_COMMISSION');
  const serviceRates = new Map(vendor.serviceCommissionRates.map(row => [row.serviceId.toString(), row.rate]));
  const commissionAmount = Math.round(bills.reduce((sum, bill) => {
    const job = jobs.find(item => item._id.toString() === bill.serviceRequestId?.toString())!;
    const rate = vendor.commissionModel === 'SERVICE_WISE' ? serviceRates.get(job.serviceId.toString()) : commissionRate;
    if (rate === undefined) throw new ConflictError('Set a commission rate for every service included in this settlement', 'MISSING_SERVICE_COMMISSION');
    return sum + bill.total * rate / 100;
  }, 0) * 100) / 100;
  const netPayable = Math.round((input.grossAmount - commissionAmount) * 100) / 100;

  const number = await getNextNumber('VENDOR_INVOICE');
  const invoice = await VendorInvoiceModel.create({
    number,
    vendorId: input.vendorId,
    serviceRequestIds: input.serviceRequestIds,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    amount: netPayable,
    commissionBreakup: { grossAmount: input.grossAmount, commissionRate: input.grossAmount ? Math.round(commissionAmount / input.grossAmount * 10000) / 100 : 0, commissionAmount, netPayable },
  });

  await logActivity({
    entityType: 'VENDOR_INVOICE',
    entityId: invoice._id.toString(),
    user: actor,
    action: 'CREATED',
    module: 'vendors',
    newValue: { vendorId: input.vendorId, netPayable },
  });

  return invoice;
}

export async function listVendorInvoices(params: { page: number; limit: number; vendorId?: string | null; status?: string }) {
  const filter: Record<string, unknown> = {};
  if (params.vendorId !== undefined) filter.vendorId = params.vendorId;
  if (params.status) filter.status = params.status;

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    VendorInvoiceModel.find(filter).skip(skip).limit(params.limit).sort({ createdAt: -1 }),
    VendorInvoiceModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}

export async function approveVendorInvoice(id: string, actor: AccessTokenPayload) {
  const invoice = await VendorInvoiceModel.findById(id);
  if (!invoice) throw new NotFoundError('Vendor invoice not found');
  if (invoice.status === 'APPROVED') return invoice;
  if (invoice.status !== 'PENDING') throw new ConflictError('Only pending invoices can be approved', 'INVALID_INVOICE_STATUS');
  const approved = await VendorInvoiceModel.findOneAndUpdate({ _id: id, status: 'PENDING' }, { $set: { status: 'APPROVED' } }, { new: true });
  if (!approved) throw new ConflictError('Invoice state changed; refresh before approving', 'INVOICE_STATE_CHANGED');
  await logActivity({ entityType: 'VENDOR_INVOICE', entityId: id, user: actor, action: 'APPROVED', module: 'vendors' });
  return invoice;
}

interface CreatePayoutInput {
  vendorId: string;
  vendorInvoiceIds: string[];
}

export async function createVendorPayout(input: CreatePayoutInput, actor: AccessTokenPayload) {
  const ids = [...new Set(input.vendorInvoiceIds)];
  const invoices = await VendorInvoiceModel.find({ _id: { $in: ids }, vendorId: input.vendorId, status: 'APPROVED' });
  if (ids.length !== input.vendorInvoiceIds.length || invoices.length !== ids.length) throw new ConflictError('Select distinct approved invoices belonging to this vendor', 'INVALID_PAYOUT_INVOICES');
  if (await VendorPayoutModel.exists({ vendorInvoiceIds: { $in: ids } })) throw new ConflictError('An invoice is already allocated to a payout', 'PAYOUT_EXISTS');
  if (invoices.length === 0) throw new NotFoundError('No matching approved vendor invoices found');

  const amount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const number = await getNextNumber('VENDOR_PAYOUT');

  const payout = await VendorPayoutModel.create({
    number,
    vendorId: input.vendorId,
    vendorInvoiceIds: input.vendorInvoiceIds,
    amount,
  });

  await logActivity({
    entityType: 'VENDOR_PAYOUT',
    entityId: payout._id.toString(),
    user: actor,
    action: 'CREATED',
    module: 'vendors',
    newValue: { vendorId: input.vendorId, amount },
  });

  return payout;
}

export async function markPayoutPaid(id: string, reference: string, actor: AccessTokenPayload) {
  if (!reference.trim()) throw new ConflictError('A payout reference is required', 'REFERENCE_REQUIRED');
  const session = await mongoose.startSession();
  let payout!: InstanceType<typeof VendorPayoutModel>;
  try { await session.withTransaction(async () => {
    const live = await VendorPayoutModel.findById(id).session(session);
    if (!live) throw new NotFoundError('Vendor payout not found');
    payout = live;
    if (live.status === 'PAID') { if (live.reference !== reference) throw new ConflictError('This payout was already paid with another reference', 'PAYOUT_ALREADY_PAID'); return; }
    if (!['PENDING', 'PROCESSING'].includes(live.status)) throw new ConflictError('Payout is not payable', 'INVALID_PAYOUT_STATUS');
    const eligible = await VendorInvoiceModel.countDocuments({ _id: { $in: live.vendorInvoiceIds }, vendorId: live.vendorId, status: 'APPROVED' }).session(session);
    if (eligible !== live.vendorInvoiceIds.length) throw new ConflictError('All payout invoices must still be approved', 'INVALID_PAYOUT_INVOICES');
    live.status = 'PAID'; live.paidAt = new Date(); live.reference = reference;
    await live.save({ session });
    await VendorInvoiceModel.updateMany({ _id: { $in: live.vendorInvoiceIds }, vendorId: live.vendorId, status: 'APPROVED' }, { $set: { status: 'PAID' } }, { session });
  }); } finally { await session.endSession(); }

  await logActivity({ entityType: 'VENDOR_PAYOUT', entityId: id, user: actor, action: 'PAID', module: 'vendors', reason: reference });
  return payout;
}

export async function listVendorPayouts(params: { page: number; limit: number; vendorId?: string | null; status?: string }) {
  const filter: Record<string, unknown> = {};
  if (params.vendorId !== undefined) filter.vendorId = params.vendorId;
  if (params.status) filter.status = params.status;

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    VendorPayoutModel.find(filter).skip(skip).limit(params.limit).sort({ createdAt: -1 }),
    VendorPayoutModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}
