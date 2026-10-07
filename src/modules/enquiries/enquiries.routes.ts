import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../lib/actor';
import { paramAsString, sendSuccess } from '../../lib/apiResponse';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { publicBookingRateLimit } from '../../middleware/rateLimit.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as service from './enquiries.service';
import type { EnquiryType } from './enquiry.model';
import {
  listEnquiriesQuerySchema,
  publicContactEnquirySchema,
  publicQuickBookingSchema,
  updateEnquiryStatusSchema,
} from './enquiries.validation';

// Enquiry Section → Quick Booking / Contact Enquiry. Public website forms post
// here (strictly rate limited); staff with Leads access work through them.
const router = Router();

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.post(
  '/public/quick-bookings',
  publicBookingRateLimit,
  validate(publicQuickBookingSchema),
  handle(async (req, res) => {
    sendSuccess(res, await service.createQuickBooking(req.body), 'Booking request received', null, 201);
  })
);

router.post(
  '/public/contact-enquiries',
  publicBookingRateLimit,
  validate(publicContactEnquirySchema),
  handle(async (req, res) => {
    sendSuccess(res, await service.createContactEnquiry(req.body), 'Message received', null, 201);
  })
);

router.get(
  '/enquiries',
  authMiddleware,
  requirePermission('leads', 'view'),
  validate(listEnquiriesQuerySchema, 'query'),
  handle(async (req, res) => {
    sendSuccess(res, await service.listEnquiries(req.query.type as EnquiryType), 'Enquiries fetched successfully');
  })
);

router.get(
  '/enquiries/pending-counts',
  authMiddleware,
  requirePermission('leads', 'view'),
  handle(async (_req, res) => {
    sendSuccess(res, await service.pendingCounts(), 'Pending counts fetched');
  })
);

router.patch(
  '/enquiries/:id/status',
  authMiddleware,
  requirePermission('leads', 'edit'),
  validate(updateEnquiryStatusSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateEnquiryStatus(paramAsString(req.params.id), req.body.status, actor), 'Status updated');
  })
);

router.delete(
  '/enquiries/:id',
  authMiddleware,
  requirePermission('leads', 'edit'),
  handle(async (req, res) => {
    await service.deleteEnquiry(paramAsString(req.params.id));
    sendSuccess(res, null, 'Enquiry deleted');
  })
);

export default router;
