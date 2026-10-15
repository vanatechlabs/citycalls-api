import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { resolveActor } from '../../lib/actor';
import { paramAsString, sendSuccess } from '../../lib/apiResponse';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as service from './customerProfile.service';

// Customer Section (All Customers + customer profile) and the admin top
// bar's customer search. Profiles are kept up to date by the Service Call /
// Call Enquiry / website enquiry saves themselves; here they can only be
// looked up, or removed from the list.
const router = Router();
const BASE = '/customer-profiles';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Type at least 2 characters to search').max(100),
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date');

export const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['recent', 'oldest', 'name']).default('recent'),
  // Custom date range (India dates, both days included), on the customer's
  // last activity or the day they first called / enquired.
  from: day.optional(),
  to: day.optional(),
  dateField: z.enum(['lastSeenAt', 'firstSeenAt']).default('lastSeenAt'),
}).refine((v) => !v.from || !v.to || v.from <= v.to, { message: 'From date must be on or before the To date', path: ['to'] });

const canView = [authMiddleware, requirePermission('customers', 'view')];

router.get(`${BASE}/search`, ...canView, validate(searchQuerySchema, 'query'), handle(async (req, res) => {
  const { q } = req.query as unknown as z.infer<typeof searchQuerySchema>;
  sendSuccess(res, await service.searchCustomers(q), 'Customers found');
}));

router.get(`${BASE}/summary`, ...canView, handle(async (_req, res) => {
  sendSuccess(res, await service.getCustomerSummary(), 'Customer summary fetched successfully');
}));

router.get(BASE, ...canView, validate(listQuerySchema, 'query'), handle(async (req, res) => {
  const params = req.query as unknown as z.infer<typeof listQuerySchema>;
  const { items, pagination } = await service.listCustomers(params);
  sendSuccess(res, items, 'Customers fetched successfully', pagination);
}));

// :key = CityCalls ID (CC-000123) or mobile number.
router.get(`${BASE}/:key`, ...canView, handle(async (req, res) => {
  sendSuccess(res, await service.getCustomerProfile(paramAsString(req.params.key)), 'Customer profile fetched successfully');
}));

// Removes the profile from All Customers; their calls / enquiries stay.
router.delete(`${BASE}/:key`, authMiddleware, requirePermission('customers', 'edit'), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  await service.deleteCustomer(paramAsString(req.params.key), actor);
  sendSuccess(res, null, 'Customer removed from All Customers');
}));

export default router;
