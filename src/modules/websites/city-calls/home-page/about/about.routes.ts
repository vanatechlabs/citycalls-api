import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as aboutService from './about.service';
import { updateAboutSchema } from './about.validation';

// Admin → Website Section → About: the home page's "About CityCalls" section
// (heading, text, points, mission / vision, button and three images).
const router = Router();
const adminPath = '/websites/city-calls/home-page/about';
const publicPath = '/public/websites/city-calls/home-page/about';

router.get(publicPath, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await aboutService.getPublicAbout(), 'About section fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), async (_req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await aboutService.getAbout(), 'About section fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.put(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateAboutSchema),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await resolveActor(req.user?.sub);
      sendSuccess(res, await aboutService.updateAbout(req.body, actor), 'About section updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
