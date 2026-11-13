import { computeDocumentTotals } from '../../lib/financialTotals';
import { MasterModel } from '../config/master.model';
import { IService } from './catalog.model';
import { ConflictError } from '../../lib/errors';

export type PricingMode = 'FIXED' | 'HOURLY' | 'ESTIMATE';
export interface BookingPrice {
  mode: PricingMode;
  unitPrice: number;
  hours: number;
  helpers: number;
  visitingCharge: number;
  inspectionCharge: number;
  total: number;
  subtotal: number;
  taxBreakup: { cgst: number; sgst: number; igst: number };
  roundOff: number;
  items: { description: string; qty: number; unitPrice: number; taxRateId?: string; lineTotal: number }[];
  quotedAt: Date;
}

export async function effectivePricing(service: Pick<IService, 'categoryId' | 'pricing'>) {
  const category = await MasterModel.findById(service.categoryId).select('key label meta').lean();
  const appliance = category?.key === 'HOME_APPLIANCES' || /appliance/i.test(category?.label ?? '');
  const help = category?.key === 'HELP_NOW' || category?.meta?.vertical === 'HELP_NOW';
  const mode: PricingMode = appliance ? 'ESTIMATE' : help ? (service.pricing.mode === 'FIXED' ? 'FIXED' : 'HOURLY') : 'FIXED';
  return { ...service.pricing, mode, hourlyRate: service.pricing.hourlyRate ?? service.pricing.basePrice };
}

export async function quoteService(service: Pick<IService, 'categoryId' | 'pricing'> & { taxRateId?: { toString(): string } }, plan: { hours?: number; helpers?: number } = {}, states: { branchState: string; customerState: string } = { branchState: 'IN', customerState: 'IN' }): Promise<BookingPrice> {
  const pricing = await effectivePricing(service);
  const hours = pricing.mode === 'HOURLY' ? (plan.hours ?? 1) : 1;
  const helpers = pricing.mode === 'HOURLY' ? (plan.helpers ?? 1) : 1;
  if (!Number.isInteger(hours) || hours < 1 || hours > 16 || !Number.isInteger(helpers) || helpers < 1 || helpers > 4) throw new ConflictError('Choose 1–16 hours and 1–4 helpers', 'INVALID_PLAN');
  const unitPrice = pricing.mode === 'HOURLY' ? pricing.hourlyRate : pricing.basePrice;
  if (pricing.mode !== 'ESTIMATE' && unitPrice <= 0) throw new ConflictError('This service needs a price before it can be booked', 'PRICE_NOT_CONFIGURED');
  const visitingCharge = pricing.visitingCharge ?? 0;
  const inspectionCharge = pricing.mode === 'ESTIMATE' ? (pricing.inspectionCharge ?? 0) : 0;
  const taxRateId = service.taxRateId?.toString();
  const items = [
    { description: pricing.mode === 'HOURLY' ? `Booked work: ${hours} hours × ${helpers} helpers` : pricing.mode === 'FIXED' ? 'Fixed service' : 'Inspection', qty: 1, unitPrice: pricing.mode === 'ESTIMATE' ? inspectionCharge : unitPrice * hours * helpers, taxRateId },
    ...(visitingCharge ? [{ description: 'Visiting charge', qty: 1, unitPrice: visitingCharge, taxRateId }] : []),
  ];
  const totals = await computeDocumentTotals(items, 0, states.branchState, states.customerState);
  return { mode: pricing.mode, unitPrice, hours, helpers, visitingCharge, inspectionCharge, total: totals.total, subtotal: totals.subtotal, taxBreakup: totals.taxBreakup, roundOff: totals.roundOff, items: totals.items, quotedAt: new Date() };
}
