import { EstimateModel } from './estimates.model';
import { ConflictError } from '../../lib/errors';
import { round2 } from '../../lib/gst';

export async function approvedEstimateBill(serviceRequestId: string) {
  if (await EstimateModel.exists({ serviceRequestId, status: { $in: ['DRAFT', 'SHARED'] } })) throw new ConflictError('Resolve all pending estimates before generating the final bill', 'ESTIMATES_PENDING');
  const estimates = await EstimateModel.find({ serviceRequestId, status: { $in: ['APPROVED', 'CONVERTED'] } }).sort({ createdAt: 1 });
  if (!estimates.length) throw new ConflictError('A customer-approved estimate is required', 'ESTIMATE_REQUIRED');
  return {
    estimateIds: estimates.map(e => e._id),
    items: estimates.flatMap(e => e.items.map(item => ({ description: `${e.number}: ${item.description}`, partId: item.partId, qty: item.qty, unitPrice: item.unitPrice, taxRateId: item.taxRateId, lineTotal: item.lineTotal }))),
    subtotal: round2(estimates.reduce((n, e) => n + e.subtotal, 0)),
    discount: round2(estimates.reduce((n, e) => n + e.discount, 0)),
    taxBreakup: { cgst: round2(estimates.reduce((n, e) => n + e.taxBreakup.cgst, 0)), sgst: round2(estimates.reduce((n, e) => n + e.taxBreakup.sgst, 0)), igst: round2(estimates.reduce((n, e) => n + e.taxBreakup.igst, 0)) },
    roundOff: round2(estimates.reduce((n, e) => n + e.roundOff, 0)), total: round2(estimates.reduce((n, e) => n + e.total, 0)),
  };
}
