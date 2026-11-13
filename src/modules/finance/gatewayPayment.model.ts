import { Schema, model } from 'mongoose';

const schema = new Schema({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  customerUserId: { type: String, required: true },
  orderId: { type: String, required: true, unique: true },
  amountPaise: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'PAID', 'REVIEW'], default: 'PENDING', index: true },
  paymentId: String, lastError: String,
}, { timestamps: true });
export const GatewayPaymentModel = model('AppGatewayPayment', schema);
