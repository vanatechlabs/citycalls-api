import { Schema, model, Document } from 'mongoose';
import { financialDocumentCommonFields, ILineItem, ITaxBreakup } from './financial.types';

export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface IInvoice extends Document {
  onlinePaymentLockUntil?: Date;
  estimateIds?: Schema.Types.ObjectId[];
  billingKey?: string;
  number: string;
  serviceRequestId?: Schema.Types.ObjectId;
  leadId?: Schema.Types.ObjectId;
  customerId: Schema.Types.ObjectId;
  branchId: Schema.Types.ObjectId;
  financialYear: string;
  items: ILineItem[];
  subtotal: number;
  taxBreakup: ITaxBreakup;
  discount: number;
  roundOff: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  proformaInvoiceId?: Schema.Types.ObjectId;
  pdfUrl?: string;
  sentVia: string[];
  revisionOf?: Schema.Types.ObjectId;
  cancelledAt?: Date;
  cancelReason?: string;
  approvedBy?: Schema.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    ...financialDocumentCommonFields,
    onlinePaymentLockUntil: Date,
    estimateIds: [{ type: Schema.Types.ObjectId, ref: 'Estimate' }],
    billingKey: String,
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: INVOICE_STATUSES, default: 'DRAFT' },
    proformaInvoiceId: { type: Schema.Types.ObjectId, ref: 'ProformaInvoice' },
  },
  { timestamps: true }
);

invoiceSchema.index({ proformaInvoiceId: 1 }, { unique: true, partialFilterExpression: { proformaInvoiceId: { $type: 'objectId' } } });
invoiceSchema.index({ serviceRequestId: 1 }, { name: 'one_active_invoice_per_job', unique: true, partialFilterExpression: { serviceRequestId: { $type: 'objectId' }, status: { $in: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID'] } } });
invoiceSchema.index({ customerId: 1 });
invoiceSchema.index({ status: 1 });

export const InvoiceModel = model<IInvoice>('Invoice', invoiceSchema);
