import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as countersService from './counters.service';
import { updateCountersSchema } from './counters.validation';

// Admin → Website Section → Counters: the home page's number cards
// ("10,000+ Happy Customers" …) with their background images.
const router = Router();
const adminPath = '/websites/city-calls/home-page/counters';
const publicPath = '/public/websites/city-calls/home-page/counters';

router.get(publicPath, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await countersService.getPublicCounters(), 'Counters fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), async (_req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await countersService.getCounters(), 'Counters fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.put(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateCountersSchema),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await resolveActor(req.user?.sub);
      sendSuccess(res, await countersService.updateCounters(req.body, actor), 'Counters updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
