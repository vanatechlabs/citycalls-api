import { Types } from 'mongoose';
import { InvoiceModel, IInvoice } from './invoices.model';
import { PaymentReceiptModel } from './paymentReceipts.model';
import { GatewayPaymentModel } from './gatewayPayment.model';
import { ActivityLogModel } from '../audit/activityLog.model';

const ACTIVE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID'];

// "One active invoice per job" is enforced by the one_active_invoice_per_job
// unique index, but jobs invoiced before that rule existed can have two active
// invoices, and then MongoDB refuses to build the index at all. Runs on every
// server start, before ensureAppIndexes(); once no job has duplicates it does
// nothing.
//
// For each such job it keeps one invoice and cancels the extras the same way
// cancelInvoice() does (status, cancelledAt, cancelReason, activity log).
// Money is never touched: an invoice with a recorded amount, a payment
// receipt or any online-payment attempt is never cancelled, and a job where
// more than one invoice has money is left alone and logged for a person to
// sort out with a credit note.
export async function cancelDuplicateActiveInvoices(): Promise<void> {
  const groups = await InvoiceModel.aggregate<{ _id: Types.ObjectId; ids: Types.ObjectId[] }>([
    { $match: { serviceRequestId: { $type: 'objectId' }, status: { $in: ACTIVE_STATUSES } } },
    { $group: { _id: '$serviceRequestId', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (!groups.length) return;

  let cancelled = 0;
  const needsReview: string[] = [];
  for (const group of groups) {
    const invoices = await InvoiceModel.find({ _id: { $in: group.ids } });
    const [receiptInvoiceIds, gatewayInvoiceIds] = await Promise.all([
      PaymentReceiptModel.distinct('invoiceId', { invoiceId: { $in: group.ids } }),
      GatewayPaymentModel.distinct('invoiceId', { invoiceId: { $in: group.ids } }),
    ]);
    const withPaymentRecords = new Set([...receiptInvoiceIds, ...gatewayInvoiceIds].map(String));
    const now = new Date();
    const hasMoney = (invoice: IInvoice) =>
      invoice.amountPaid > 0 ||
      invoice.status === 'PAID' ||
      invoice.status === 'PARTIALLY_PAID' ||
      withPaymentRecords.has(String(invoice._id)) ||
      (invoice.onlinePaymentLockUntil !== undefined && invoice.onlinePaymentLockUntil > now);

    const paid = invoices.filter(hasMoney);
    if (paid.length > 1) {
      needsReview.push(String(group._id));
      continue;
    }
    const keep = paid[0] ?? pickInvoiceToKeep(invoices);

    for (const invoice of invoices) {
      if (String(invoice._id) === String(keep._id)) continue;
      const reason = `Duplicate active invoice for this job — auto-cancelled, ${keep.number} kept`;
      // Re-checks "no money" in the write itself, so a payment landing between
      // the read above and this update can't be cancelled out from under it.
      const result = await InvoiceModel.updateOne(
        { _id: invoice._id, status: invoice.status, amountPaid: { $lte: 0 } },
        { $set: { status: 'CANCELLED', cancelledAt: now, cancelReason: reason } }
      );
      if (!result.modifiedCount) continue;
      cancelled++;
      await ActivityLogModel.create({
        entityType: 'INVOICE',
        entityId: invoice._id,
        // No human actor — same convention as happyCallScheduler.
        userRole: 'SYSTEM',
        action: 'CANCELLED',
        module: 'finance',
        oldValue: { status: invoice.status },
        newValue: { status: 'CANCELLED' },
        reason,
        sourceApp: 'duplicateInvoiceRepair',
      });
      console.log(`[invoices] cancelled duplicate ${invoice.number} on job ${String(group._id)} (kept ${keep.number})`);
    }
  }

  console.log(`[invoices] duplicate active invoices: ${cancelled} cancelled, ${needsReview.length} job(s) left for review`);
  if (needsReview.length) {
    console.warn(
      `[invoices] ⚠️  jobs with more than one paid invoice — fix with a credit note, then restart: ${needsReview.join(', ')}`
    );
  }
}

// Without any payment to go by: an issued invoice over a draft, then one the
// customer was already sent, then the newest.
function pickInvoiceToKeep(invoices: IInvoice[]): IInvoice {
  const rank = (invoice: IInvoice) => [
    invoice.status === 'DRAFT' ? 0 : 1,
    invoice.sentVia?.length ? 1 : 0,
    invoice.createdAt?.getTime() ?? 0,
  ];
  return [...invoices].sort((a, b) => {
    const [ra, rb] = [rank(a), rank(b)];
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i];
    return 0;
  })[0];
}
