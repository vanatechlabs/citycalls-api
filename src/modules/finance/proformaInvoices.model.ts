import { Schema, model, Document } from 'mongoose';
import { financialDocumentCommonFields, ILineItem, ITaxBreakup } from './financial.types';

export const PROFORMA_INVOICE_STATUSES = ['DRAFT', 'SHARED', 'ACCEPTED', 'CONVERTED', 'CANCELLED'] as const;
export type ProformaInvoiceStatus = (typeof PROFORMA_INVOICE_STATUSES)[number];

export interface IProformaInvoice extends Document {
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
  status: ProformaInvoiceStatus;
  estimateId?: Schema.Types.ObjectId;
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

const proformaInvoiceSchema = new Schema<IProformaInvoice>(
  {
    ...financialDocumentCommonFields,
    estimateIds: [{ type: Schema.Types.ObjectId, ref: 'Estimate' }],
    billingKey: String,
    status: { type: String, enum: PROFORMA_INVOICE_STATUSES, default: 'DRAFT' },
    estimateId: { type: Schema.Types.ObjectId, ref: 'Estimate' },
  },
  { timestamps: true }
);

proformaInvoiceSchema.index({ estimateId: 1 }, { unique: true, partialFilterExpression: { estimateId: { $type: 'objectId' } } });
proformaInvoiceSchema.index({ billingKey: 1 }, { unique: true, partialFilterExpression: { billingKey: { $type: 'string' } } });
proformaInvoiceSchema.index({ serviceRequestId: 1 });
proformaInvoiceSchema.index({ customerId: 1 });
proformaInvoiceSchema.index({ status: 1 });

export const ProformaInvoiceModel = model<IProformaInvoice>('ProformaInvoice', proformaInvoiceSchema);
