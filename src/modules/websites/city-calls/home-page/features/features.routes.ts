import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as featuresService from './features.service';
import { updateFeaturesSchema } from './features.validation';

// Admin → Website Section → Features: the home page's "Home repairs
// everywhere…" section (heading, text, popup image and feature cards).
const router = Router();
const adminPath = '/websites/city-calls/home-page/features';
const publicPath = '/public/websites/city-calls/home-page/features';

router.get(publicPath, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await featuresService.getPublicFeatures(), 'Features fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), async (_req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await featuresService.getFeatures(), 'Features fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.put(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateFeaturesSchema),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await resolveActor(req.user?.sub);
      sendSuccess(res, await featuresService.updateFeatures(req.body, actor), 'Features updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
