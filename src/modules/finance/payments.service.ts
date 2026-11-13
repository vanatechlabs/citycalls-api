import { ServiceRequestModel } from '../service-requests/serviceRequests.model';
import { emitServiceRequestStatusChanged } from '../../realtime';
import mongoose from 'mongoose';
import { assertFinanceAccess, assertFinanceStaff } from './financeAccess';
import { PaymentReceiptModel, PaymentMethod } from './paymentReceipts.model';
import { InvoiceModel } from './invoices.model';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { getNextNumber, currentFinancialYear } from '../../lib/numbering';
import { generateDocumentPdf } from '../../lib/pdfGenerator';
import { trigger } from '../../lib/notifications';
import { logActivity } from '../../lib/auditLog';
import { AccessTokenPayload } from '../../lib/jwt';
import { updateStatus as updateServiceRequestStatus } from '../service-requests/serviceRequests.service';



interface RecordPaymentInput {
  idempotencyKey: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  proofUrl?: string;
}

// Per docs/16-pdf-and-financial-documents.md §7: an Invoice's status
// (PARTIALLY_PAID/PAID) is derived from the sum of its linked receipts, never
// set directly — this is the one function that writes both, atomically from
// the caller's perspective, so the two can never drift apart.
export async function recordPayment(invoiceId: string, input: RecordPaymentInput, actor: AccessTokenPayload) {
  return recordCollection(invoiceId, input, actor, false);
}

// Only the provider-verification service calls this; there is no client-facing manual bypass.
export async function recordVerifiedGatewayPayment(invoiceId: string, input: RecordPaymentInput, actor: AccessTokenPayload) {
  return recordCollection(invoiceId, input, actor, true);
}

async function recordCollection(invoiceId: string, input: RecordPaymentInput, actor: AccessTokenPayload, verifiedGateway: boolean) {
  if (!verifiedGateway) { assertFinanceStaff(actor); if (input.method === 'GATEWAY') throw new ConflictError('Gateway payments require provider verification', 'GATEWAY_VERIFICATION_REQUIRED'); }
  if (!input.idempotencyKey || !Number.isFinite(input.amount) || input.amount <= 0 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.00001) throw new ConflictError('A collection needs a retry key and positive amount in paise', 'INVALID_COLLECTION');
  const invoice = await InvoiceModel.findById(invoiceId);
  if (!invoice) throw new NotFoundError('Invoice not found');
  await assertFinanceAccess(invoice, actor);
  if (invoice.status === 'CANCELLED') {
    throw new ConflictError('Cannot record a payment against a cancelled invoice', 'INVOICE_CANCELLED');
  }

  const prior = await PaymentReceiptModel.findOne({ invoiceId, idempotencyKey: input.idempotencyKey });
  if (prior) {
    if (prior.amount !== input.amount || prior.method !== input.method) throw new ConflictError('Payment retry differs from original', 'IDEMPOTENCY_MISMATCH');
    return prior;
  }
  const number = await getNextNumber('PAYMENT_RECEIPT', invoice.branchId.toString());
  const session = await mongoose.startSession();
  let statusChange: { fromStatus: 'PAYMENT_PENDING' | 'PARTIALLY_PAID'; toStatus: 'PARTIALLY_PAID' | 'PAID'; serviceRequestId: string } | undefined;
  let receipt!: InstanceType<typeof PaymentReceiptModel>;
  try { await session.withTransaction(async () => {
    statusChange = undefined;
    const live = await InvoiceModel.findById(invoiceId).session(session);
    const replay = await PaymentReceiptModel.findOne({ invoiceId, idempotencyKey: input.idempotencyKey }).session(session);
    if (replay) { if (replay.amount !== input.amount || replay.method !== input.method) throw new ConflictError('Payment retry differs from original', 'IDEMPOTENCY_MISMATCH'); receipt = replay; return; }
    if (!live || live.status === 'CANCELLED' || input.amount > Math.round((live.total - live.amountPaid) * 100) / 100) throw new ConflictError('Payment exceeds the outstanding balance or invoice is cancelled', 'INVALID_COLLECTION');
    if (!verifiedGateway && live.onlinePaymentLockUntil && live.onlinePaymentLockUntil > new Date()) throw new ConflictError('Customer online checkout is active. Refresh payment status before collecting.', 'ONLINE_CHECKOUT_ACTIVE');
    const created = await PaymentReceiptModel.create([{
      number, invoiceId, idempotencyKey: input.idempotencyKey, customerId: live.customerId, branchId: live.branchId,
      financialYear: currentFinancialYear(), amount: input.amount, method: input.method, reference: input.reference, proofUrl: input.proofUrl, collectedBy: actor.sub,
    }], { session });
    receipt = created[0];
    live.amountPaid = Math.round((live.amountPaid + input.amount) * 100) / 100;
    live.status = live.amountPaid >= live.total ? 'PAID' : 'PARTIALLY_PAID';
    await live.save({ session });
    invoice.amountPaid = live.amountPaid; invoice.status = live.status;
    if (live.serviceRequestId) {
      const job = await ServiceRequestModel.findById(live.serviceRequestId).session(session);
      if (job && (job.status === 'PAYMENT_PENDING' || job.status === 'PARTIALLY_PAID') && job.status !== live.status) {
        statusChange = { serviceRequestId: job.id, fromStatus: job.status, toStatus: live.status };
        await updateServiceRequestStatus(job.id, live.status, verifiedGateway ? { ...actor, role: 'SUPER_ADMIN' } : actor, { reason: `Payment recorded via receipt ${number}` }, session);
      }
    }
  }); } finally { await session.endSession(); }
  try { receipt.pdfUrl = await generateDocumentPdf('PAYMENT_RECEIPT', receipt._id.toString()); await receipt.save(); } catch (error) { console.error('[payments] Receipt saved; PDF generation needs retry', error); }

  await logActivity({
    entityType: 'INVOICE',
    entityId: invoiceId,
    user: actor,
    action: 'PAYMENT_RECORDED',
    module: 'finance',
    newValue: { receiptId: receipt._id, amount: input.amount, newStatus: invoice.status },
  });

  await trigger('PAYMENT_RECEIVED', {
    recipient: { customerId: invoice.customerId.toString() },
    variables: { invoiceId, receiptNumber: number, amount: input.amount },
  });

  // The invoice, receipt and eligible job status were committed together.
  if (statusChange) emitServiceRequestStatusChanged(statusChange.serviceRequestId, statusChange);
  return receipt;
}

export async function listPaymentsForInvoice(invoiceId: string, actor?: AccessTokenPayload) {
  if (actor) {
    const invoice = await InvoiceModel.findById(invoiceId).select('customerId branchId serviceRequestId');
    if (!invoice) throw new NotFoundError('Invoice not found');
    await assertFinanceAccess(invoice, actor);
  }
  return PaymentReceiptModel.find({ invoiceId }).sort({ createdAt: -1 });
}

export async function getPaymentReceipt(id: string, actor?: AccessTokenPayload) {
  const receipt = await PaymentReceiptModel.findById(id);
  if (!receipt) throw new NotFoundError('Payment receipt not found');
  const invoice = await InvoiceModel.findById(receipt.invoiceId);
  if (!invoice) throw new NotFoundError('Invoice not found');
  await assertFinanceAccess(invoice, actor);
  return receipt;
}
