import crypto from 'crypto';
import { env } from '../../config/env';
import { createRazorpayOrder, razorpayKeyId, verifyRazorpaySignature } from '../../lib/razorpayAdapter';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors';
import { AccessTokenPayload } from '../../lib/jwt';
import { isCustomerRole } from '../../lib/ownCustomerScope';
import { InvoiceModel } from './invoices.model';
import { assertFinanceAccess } from './financeAccess';
import { GatewayPaymentModel } from './gatewayPayment.model';
import { recordVerifiedGatewayPayment } from './payments.service';

async function gatewayGet(path: string) {
  const authorization = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, { headers: { Authorization: `Basic ${authorization}` }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new AppError(502, 'Payment provider verification is temporarily unavailable');
  return response.json() as Promise<Record<string, unknown>>;
}

export async function createInvoiceCheckout(invoiceId: string, actor: AccessTokenPayload) {
  if (!isCustomerRole(actor.role)) throw new UnauthorizedError('Customer checkout requires a customer account');
  const invoice = await InvoiceModel.findById(invoiceId);
  if (!invoice) throw new NotFoundError('Invoice not found');
  await assertFinanceAccess(invoice, actor);
  if (invoice.status === 'CANCELLED' || invoice.total <= invoice.amountPaid) throw new ConflictError('There is no outstanding amount to pay', 'NOT_PAYABLE');
  const amountPaise = Math.round((invoice.total - invoice.amountPaid) * 100);
  const active = await GatewayPaymentModel.findOne({ invoiceId, customerUserId: actor.sub, status: 'PENDING', amountPaise, createdAt: { $gt: new Date(Date.now() - 15 * 60000) } }).sort({ createdAt: -1 });
  if (active) return { orderId: active.orderId, keyId: razorpayKeyId(), amount: amountPaise, currency: 'INR', name: 'CityCalls', description: invoice.number };
  const locked = await InvoiceModel.findOneAndUpdate({ _id: invoiceId, amountPaid: invoice.amountPaid, status: { $ne: 'CANCELLED' }, $or: [{ onlinePaymentLockUntil: { $exists: false } }, { onlinePaymentLockUntil: { $lte: new Date() } }] }, { $set: { onlinePaymentLockUntil: new Date(Date.now() + 15 * 60000) } }, { new: true });
  if (!locked) throw new ConflictError('Another checkout or collection is in progress. Please refresh shortly.', 'CHECKOUT_IN_PROGRESS');
  try {
    const order = await createRazorpayOrder({ amountPaise, receipt: `inv_${crypto.randomBytes(10).toString('hex')}`, notes: { invoiceId } });
    await GatewayPaymentModel.create({ invoiceId, customerUserId: actor.sub, orderId: order.id, amountPaise });
    return { orderId: order.id, keyId: razorpayKeyId(), amount: amountPaise, currency: 'INR', name: 'CityCalls', description: invoice.number };
  } catch (error) {
    await InvoiceModel.updateOne({ _id: invoiceId }, { $unset: { onlinePaymentLockUntil: 1 } });
    throw error;
  }
}

export async function applyCapturedPayment(orderId: string, paymentId: string) {
  const order = await GatewayPaymentModel.findOne({ orderId });
  if (!order) throw new NotFoundError('Payment order not found');
  if (order.status === 'PAID') return { status: 'PAID' };
  const payment = await gatewayGet(`payments/${encodeURIComponent(paymentId)}`);
  if (payment.order_id !== orderId || payment.amount !== order.amountPaise || payment.currency !== 'INR') throw new ConflictError('Payment does not match the invoice checkout', 'PAYMENT_MISMATCH');
  if (payment.status !== 'captured' || payment.captured !== true) return { status: 'PENDING' };
  try {
    await recordVerifiedGatewayPayment(order.invoiceId.toString(), { idempotencyKey: `razorpay:${paymentId}`, amount: order.amountPaise / 100, method: 'GATEWAY', reference: paymentId }, { sub: order.customerUserId, role: 'CUSTOMER' });
    await GatewayPaymentModel.updateOne({ _id: order._id }, { $set: { status: 'PAID', paymentId }, $unset: { lastError: 1 } });
    await InvoiceModel.updateOne({ _id: order.invoiceId }, { $unset: { onlinePaymentLockUntil: 1 } });
    return { status: 'PAID' };
  } catch (error) {
    // Preserve captured money for recovery/admin review; never ask the customer to pay again.
    const businessConflict = error instanceof AppError && error.statusCode === 409;
    await GatewayPaymentModel.updateOne({ _id: order._id }, { $set: { paymentId, status: businessConflict ? 'REVIEW' : 'PENDING', lastError: error instanceof Error ? error.message : 'Collection reconciliation pending' } });
    if (businessConflict) return { status: 'REVIEW', message: 'Payment received by the provider; the office is reconciling this invoice. Do not pay again.' };
    throw error;
  }
}

export async function confirmInvoiceCheckout(invoiceId: string, input: { orderId: string; paymentId: string; signature: string }, actor: AccessTokenPayload) {
  const order = await GatewayPaymentModel.findOne({ orderId: input.orderId, invoiceId, customerUserId: actor.sub });
  if (!order) throw new NotFoundError('Checkout not found');
  if (!verifyRazorpaySignature(input.orderId, input.paymentId, input.signature)) throw new UnauthorizedError('Payment signature mismatch');
  return applyCapturedPayment(input.orderId, input.paymentId);
}

export async function reconcileInvoiceCheckouts(invoiceId: string, actor: AccessTokenPayload) {
  const invoice = await InvoiceModel.findById(invoiceId);
  if (!invoice) throw new NotFoundError('Invoice not found');
  await assertFinanceAccess(invoice, actor);
  const orders = await GatewayPaymentModel.find({ invoiceId, status: 'PENDING' }).sort({ createdAt: -1 }).limit(5);
  for (const order of orders) {
    const payload = await gatewayGet(`orders/${encodeURIComponent(order.orderId)}/payments`);
    const payments = (payload.items ?? []) as { id: string; status: string }[];
    const captured = payments.find(payment => payment.status === 'captured');
    if (captured) await applyCapturedPayment(order.orderId, captured.id);
  }
  return GatewayPaymentModel.find({ invoiceId }).sort({ createdAt: -1 }).select('status paymentId lastError createdAt').limit(5).lean();
}

export async function processGatewayWebhook(raw: Buffer, signature: string) {
  const secret = env.razorpay.webhookSecret;
  if (!secret) throw new AppError(503, 'Payment webhook secret is not configured');
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (!/^[a-f0-9]{64}$/.test(signature) || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new UnauthorizedError('Invalid webhook signature');
  const event = JSON.parse(raw.toString('utf8')) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  const payment = event.payload?.payment?.entity;
  if (event.event === 'payment.captured' && payment?.id && payment.order_id && await GatewayPaymentModel.exists({ orderId: payment.order_id })) await applyCapturedPayment(payment.order_id, payment.id);
}

let recovering = false;
export async function recoverGatewayPayments() {
  if (recovering) return;
  recovering = true;
  try {
    const orders = await GatewayPaymentModel.find({ status: 'PENDING', createdAt: { $gt: new Date(Date.now() - 7 * 86400000) } }).limit(20);
    for (const order of orders) {
      try {
        const data = await gatewayGet(`orders/${encodeURIComponent(order.orderId)}/payments`);
        const captured = ((data.items ?? []) as { id: string; status: string }[]).find(payment => payment.status === 'captured');
        if (captured) await applyCapturedPayment(order.orderId, captured.id);
      } catch (error) { console.error('[gateway-recovery]', error instanceof Error ? error.message : error); }
    }
  } finally { recovering = false; }
}
