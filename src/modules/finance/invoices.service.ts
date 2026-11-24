import { approvedEstimateBill } from './estimateBilling';
import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { EstimateModel } from './estimates.model';
import { assertFinanceAccess, assertFinanceStaff, financeFilter } from './financeAccess';
import { InvoiceModel } from './invoices.model';
import * as proformaService from './proformaInvoices.service';
import { resolveGstStates } from './estimates.service';
import { computeDocumentTotals } from '../../lib/financialTotals';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { buildPaginationMeta } from '../../lib/apiResponse';
import { getNextNumber, currentFinancialYear } from '../../lib/numbering';
import { assertValidTransition } from '../../lib/statusEngine';
import { generateDocumentPdf } from '../../lib/pdfGenerator';
import { trigger } from '../../lib/notifications';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';
import { DataScope } from '../users/users.types';
import { isCustomerRole, resolveOwnCustomerId } from '../../lib/ownCustomerScope';
import { restrictToOwnJobs } from '../../lib/ownFieldScope';

export async function convertProformaToInvoice(proformaId: string, actor: AccessTokenPayload) {
  assertFinanceStaff(actor);
  const existing = await InvoiceModel.findOne({ proformaInvoiceId: proformaId });
  if (existing) { await assertFinanceAccess(existing, actor); await proformaService.markConverted(proformaId, actor); return existing; }
  const proforma = await proformaService.assertConvertible(proformaId);
  await assertFinanceAccess(proforma, actor);

  if (proforma.serviceRequestId) {
    const bill = await approvedEstimateBill(proforma.serviceRequestId.toString());
    if (bill.total !== proforma.total || bill.estimateIds.map(String).sort().join(':') !== (proforma.estimateIds?.length ? proforma.estimateIds : (proforma.estimateId ? [proforma.estimateId] : [])).map(String).sort().join(':')) throw new ConflictError('Approved estimates changed. Generate and accept a fresh bill.', 'BILL_CHANGED');
  }
  const number = await getNextNumber('INVOICE', proforma.branchId.toString());
  const invoice = await InvoiceModel.findOneAndUpdate({ proformaInvoiceId: proformaId }, { $setOnInsert: {
    number,
    serviceRequestId: proforma.serviceRequestId,
    leadId: proforma.leadId,
    customerId: proforma.customerId,
    branchId: proforma.branchId,
    financialYear: currentFinancialYear(),
    items: proforma.items,
    subtotal: proforma.subtotal,
    taxBreakup: proforma.taxBreakup,
    discount: proforma.discount,
    roundOff: proforma.roundOff,
    total: proforma.total,
    proformaInvoiceId: proforma._id,
    estimateIds: proforma.estimateIds,
    status: 'ISSUED',
  } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });

  await proformaService.markConverted(proformaId, actor);

  await logActivity({
    entityType: 'INVOICE',
    entityId: invoice._id.toString(),
    user: actor,
    action: 'CREATED_FROM_PROFORMA',
    module: 'finance',
    newValue: { proformaInvoiceId: proformaId, number },
  });

  return invoice;
}

interface LineItemInput {
  description: string;
  partId?: string;
  qty: number;
  unitPrice: number;
  taxRateId?: string;
}

interface CreateDirectInvoiceInput {
  customerId: string;
  branchId: string;
  serviceRequestId?: string;
  items: LineItemInput[];
  discount?: number;
}

// For services where no estimate/proforma stage occurred (docs/16 §1: "or
// generated fresh if no estimate stage occurred").
export async function createDirectInvoice(input: CreateDirectInvoiceInput, actor: AccessTokenPayload) {
  let billedEstimateIds: string[] = [];
  assertFinanceStaff(actor);
  await assertFinanceAccess(input, actor);
  if (input.serviceRequestId) {
    const job = await ServiceRequestModel.findById(input.serviceRequestId);
    if (!job || job.customerId.toString() !== input.customerId || job.branchId?.toString() !== input.branchId) throw new ConflictError('Invoice must match the booked customer and branch', 'JOB_MISMATCH');
    const existing = await InvoiceModel.findOne({ serviceRequestId: job._id, status: { $ne: 'CANCELLED' } });
    if (existing) { await assertFinanceAccess(existing, actor); return existing; }
    if (job.bookingPrice && job.bookingPrice.mode !== 'ESTIMATE') {
      input.items = job.bookingPrice.items ?? [{ description: `Booked service (${job.bookingPrice.mode})`, qty: 1, unitPrice: job.bookingPrice.total }];
      input.discount = 0;
    } else {
      const bill = await approvedEstimateBill(job.id);
      billedEstimateIds = bill.estimateIds.map(String);
      input.items = bill.items.map(item => ({ ...item, partId: item.partId?.toString(), taxRateId: item.taxRateId?.toString() }));
      input.discount = bill.discount;
    }
  }
  const { branchState, customerState } = await resolveGstStates(input.branchId, input.customerId);
  let totals = await computeDocumentTotals(input.items, input.discount ?? 0, branchState, customerState);
  if (input.serviceRequestId) {
    const job = await ServiceRequestModel.findById(input.serviceRequestId);
    if (job && (!job.bookingPrice || job.bookingPrice.mode === 'ESTIMATE')) {
      const bill = await approvedEstimateBill(job.id);
      totals = { ...bill, items: bill.items.map(item => ({ ...item, partId: item.partId?.toString(), taxRateId: item.taxRateId?.toString() })) };
    }
    if (job?.bookingPrice && job.bookingPrice.mode !== 'ESTIMATE' && job.bookingPrice.items) {
      const price = job.bookingPrice;
      const extras = await EstimateModel.find({ serviceRequestId: job._id, status: 'APPROVED' });
      billedEstimateIds = extras.map(estimate => estimate.id);
      const extraAmount = extras.reduce((sum, estimate) => sum + estimate.total, 0);
      totals = {
        items: [...price.items, ...extras.flatMap(estimate => [...estimate.items.map(item => ({ description: `Additional work ${estimate.number}: ${item.description}`, qty: item.qty, unitPrice: item.unitPrice, lineTotal: item.lineTotal, taxRateId: item.taxRateId?.toString() })), ...(estimate.discount ? [{ description: `Approved discount ${estimate.number}`, qty: 1, unitPrice: -estimate.discount, lineTotal: -estimate.discount }] : [])])],
        subtotal: price.subtotal + extras.reduce((sum, estimate) => sum + estimate.subtotal - estimate.discount, 0),
        taxBreakup: { cgst: price.taxBreakup.cgst + extras.reduce((sum, e) => sum + e.taxBreakup.cgst, 0), sgst: price.taxBreakup.sgst + extras.reduce((sum, e) => sum + e.taxBreakup.sgst, 0), igst: price.taxBreakup.igst + extras.reduce((sum, e) => sum + e.taxBreakup.igst, 0) },
        roundOff: price.roundOff + extras.reduce((sum, e) => sum + e.roundOff, 0), total: price.total + extraAmount,
      };
    }
  }

  const number = await getNextNumber('INVOICE', input.branchId);
  const invoiceData = {
    estimateIds: billedEstimateIds,
    number,
    serviceRequestId: input.serviceRequestId,
    customerId: input.customerId,
    branchId: input.branchId,
    financialYear: currentFinancialYear(),
    items: totals.items,
    subtotal: totals.subtotal,
    taxBreakup: totals.taxBreakup,
    discount: input.discount ?? 0,
    roundOff: totals.roundOff,
    total: totals.total,
    status: 'ISSUED' as const,
  };
  const invoice = input.serviceRequestId ? await InvoiceModel.findOneAndUpdate({ serviceRequestId: input.serviceRequestId, status: { $ne: 'CANCELLED' } }, { $setOnInsert: invoiceData }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }) : await InvoiceModel.create(invoiceData);

  await logActivity({
    entityType: 'INVOICE',
    entityId: invoice._id.toString(),
    user: actor,
    action: 'CREATED_DIRECT',
    module: 'finance',
    newValue: { number, total: totals.total },
  });

  return invoice;
}

export async function listInvoices(
  params: { page: number; limit: number; status?: string; customerId?: string; serviceRequestId?: string },
  scope: DataScope,
  user: AccessTokenPayload
) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.customerId) filter.customerId = params.customerId;
  if (params.serviceRequestId) filter.serviceRequestId = params.serviceRequestId;
  if (scope === 'BRANCH' && user.branchId) filter.branchId = user.branchId;
  // Same fix as estimates.service.ts's listEstimates — CUSTOMER/BUSINESS_CUSTOMER's
  // OWN scope was previously unenforced here.
  if (scope === 'OWN' && isCustomerRole(user.role)) {
    const ownId = await resolveOwnCustomerId(user.sub);
    filter.customerId = ownId ?? null;
  }
  // Field technicians (OWN scope): only invoices on jobs assigned to them.
  await restrictToOwnJobs(filter, scope, user, params.serviceRequestId);

  Object.assign(filter, await financeFilter(user));
  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    InvoiceModel.find(filter).skip(skip).limit(params.limit).sort({ createdAt: -1 }),
    InvoiceModel.countDocuments(filter),
  ]);
  return { items, meta: buildPaginationMeta(params.page, params.limit, total) };
}

export async function getInvoice(id: string, actor?: AccessTokenPayload) {
  const invoice = await InvoiceModel.findById(id);
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (actor && isCustomerRole(actor.role)) {
    const ownId = await resolveOwnCustomerId(actor.sub);
    if (!ownId || invoice.customerId.toString() !== ownId) throw new NotFoundError('Invoice not found');
  }
  await assertFinanceAccess(invoice, actor);
  return invoice;
}

export async function shareInvoice(id: string, channels: string[], actor: AccessTokenPayload) {
  const invoice = await InvoiceModel.findById(id);
  if (!invoice) throw new NotFoundError('Invoice not found');

  assertFinanceStaff(actor);
  await assertFinanceAccess(invoice, actor);
  invoice.pdfUrl = await generateDocumentPdf('INVOICE', id);
  invoice.sentVia = channels;
  await invoice.save();

  await trigger('INVOICE_GENERATED', {
    recipient: { customerId: invoice.customerId.toString() },
    variables: { invoiceId: id, number: invoice.number, total: invoice.total },
  });

  return invoice;
}

// Per docs/16-pdf-and-financial-documents.md §4: cancellable only before any
// payment is recorded. After a payment exists, corrections go through
// Credit/Debit Notes instead (creditDebitNotes.service.ts) — this function
// enforces that boundary rather than trusting the caller to check first.
export async function cancelInvoice(id: string, reason: string, actor: AccessTokenPayload) {
  const invoice = await InvoiceModel.findById(id);
  if (!invoice) throw new NotFoundError('Invoice not found');

  assertFinanceStaff(actor);
  await assertFinanceAccess(invoice, actor);
  if (invoice.amountPaid > 0) {
    throw new ConflictError(
      'Cannot cancel an invoice with payments recorded against it — issue a credit note instead',
      'INVOICE_HAS_PAYMENTS'
    );
  }

  assertValidTransition('INVOICE', invoice.status, 'CANCELLED', actor.role);
  invoice.status = 'CANCELLED';
  invoice.cancelledAt = new Date();
  invoice.cancelReason = reason;
  await invoice.save();

  await logActivity({
    entityType: 'INVOICE',
    entityId: id,
    user: actor,
    action: 'CANCELLED',
    module: 'finance',
    reason,
  });

  return invoice;
}
