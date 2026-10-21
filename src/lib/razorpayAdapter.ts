import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from './errors';

// Razorpay through its REST API (no SDK needed): create an order on the
// server, let Checkout collect the payment, then verify Checkout's signature.
const API_BASE = 'https://api.razorpay.com/v1';
const REQUEST_TIMEOUT_MS = 15_000;

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
}

export function isRazorpayEnabled() {
  return Boolean(env.razorpay.keyId && env.razorpay.keySecret);
}

// Public key for Checkout on the website — safe to send to the browser.
export function razorpayKeyId() {
  return env.razorpay.keyId ?? '';
}

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!isRazorpayEnabled()) {
    const message = 'Online payment is not available right now. Please choose pay after service.';
    throw new AppError(503, message, [{ field: 'paymentMode', code: 'PAYMENT_UNAVAILABLE', message }]);
  }

  const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt, notes: input.notes }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('[razorpay] order request failed', error);
    throw paymentGatewayError();
  }

  const body = (await response.json().catch(() => null)) as (RazorpayOrder & { error?: { description?: string } }) | null;
  if (!response.ok || !body?.id) {
    console.error(`[razorpay] order rejected (${response.status}): ${body?.error?.description ?? 'no details'}`);
    throw paymentGatewayError();
  }
  return body;
}

// Checkout's success handler returns razorpay_signature = HMAC-SHA256 of
// "<order_id>|<payment_id>" keyed with the secret.
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string) {
  if (!env.razorpay.keySecret) return false;
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

function paymentGatewayError() {
  const message = 'Could not start the payment. Please try again in a moment.';
  return new AppError(502, message, [{ field: 'paymentMode', code: 'PAYMENT_GATEWAY_ERROR', message }]);
}
