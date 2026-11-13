import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import { sendSuccess, paramAsString } from '../../lib/apiResponse';
import { confirmInvoiceCheckout, createInvoiceCheckout, reconcileInvoiceCheckouts, processGatewayWebhook } from './gatewayPayments.service';
import { UnauthorizedError } from '../../lib/errors';
import { GatewayPaymentModel } from './gatewayPayment.model';

export const gatewayWebhook = Router();
gatewayWebhook.post('/', async (req, res, next) => { try { await processGatewayWebhook(req.body as Buffer, req.get('x-razorpay-signature') ?? ''); res.json({ received: true }); } catch (error) { next(error); } });
const router = Router();
router.post('/invoices/:id/checkout', authMiddleware, requirePermission('finance', 'view'), async (req: ScopedRequest, res, next) => { try { if (!req.user) throw new UnauthorizedError(); sendSuccess(res, await createInvoiceCheckout(paramAsString(req.params.id), req.user), 'Checkout created'); } catch (error) { next(error); } });
router.post('/invoices/:id/checkout/confirm', authMiddleware, requirePermission('finance', 'view'), validate(z.object({ orderId: z.string().regex(/^order_[A-Za-z0-9]+$/), paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/), signature: z.string().regex(/^[a-f0-9]{64}$/) })), async (req: ScopedRequest, res, next) => { try { if (!req.user) throw new UnauthorizedError(); sendSuccess(res, await confirmInvoiceCheckout(paramAsString(req.params.id), req.body, req.user), 'Payment checked'); } catch (error) { next(error); } });
router.post('/invoices/:id/checkout/refresh', authMiddleware, requirePermission('finance', 'view'), async (req: ScopedRequest, res, next) => { try { if (!req.user) throw new UnauthorizedError(); sendSuccess(res, await reconcileInvoiceCheckouts(paramAsString(req.params.id), req.user), 'Payment status refreshed'); } catch (error) { next(error); } });
router.get('/finance/payment-reviews', authMiddleware, requirePermission('finance', 'viewFinancial'), async (req: ScopedRequest, res, next) => { try { const filter: Record<string, unknown> = { status: 'REVIEW' }; if (req.scope !== 'ALL') { const { financeFilter } = await import('./financeAccess'); const { InvoiceModel } = await import('./invoices.model'); const invoices = await InvoiceModel.find(await financeFilter(req.user!)).select('_id'); filter.invoiceId = { $in: invoices.map(i => i._id) }; } sendSuccess(res, await GatewayPaymentModel.find(filter).sort({ createdAt: -1 }).limit(100), 'Payment reviews'); } catch (error) { next(error); } });
export default router;
