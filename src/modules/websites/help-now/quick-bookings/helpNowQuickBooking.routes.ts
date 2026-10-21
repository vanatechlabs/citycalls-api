import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { publicBookingRateLimit } from '../../../../middleware/rateLimit.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as service from './helpNowQuickBooking.service';
import { publicHelpNowQuickBookingSchema, updateHelpNowQuickBookingStatusSchema } from './helpNowQuickBooking.validation';

// Help Now "Book Now" quick form: the public endpoint for helpnow.citycalls.in
// (strictly rate limited) and the admin list in Enquiry Section → Help Now
// Quick Booking (same access as the other enquiries).
const router = Router();
const publicPath = '/public/websites/help-now/quick-bookings';
const adminPath = '/websites/help-now/quick-bookings';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.post(
  publicPath,
  publicBookingRateLimit,
  validate(publicHelpNowQuickBookingSchema),
  handle(async (req, res) => {
    sendSuccess(res, await service.createHelpNowQuickBooking(req.body), 'Booking request received', null, 201);
  })
);

router.get(
  adminPath,
  authMiddleware,
  requirePermission('leads', 'view'),
  handle(async (_req, res) => {
    sendSuccess(res, await service.listHelpNowQuickBookings(), 'Help Now quick bookings fetched successfully');
  })
);

// Registered before `/:id` routes so the word is never read as an id.
router.get(
  `${adminPath}/pending-count`,
  authMiddleware,
  requirePermission('leads', 'view'),
  handle(async (_req, res) => {
    sendSuccess(res, await service.pendingHelpNowQuickBookings(), 'Pending count fetched');
  })
);

router.patch(
  `${adminPath}/:id/status`,
  authMiddleware,
  requirePermission('leads', 'edit'),
  validate(updateHelpNowQuickBookingStatusSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateHelpNowQuickBookingStatus(paramAsString(req.params.id), req.body.status, actor), 'Status updated');
  })
);

router.delete(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('leads', 'edit'),
  handle(async (req, res) => {
    await service.deleteHelpNowQuickBooking(paramAsString(req.params.id));
    sendSuccess(res, null, 'Quick booking deleted');
  })
);

export default router;
