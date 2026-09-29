import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as socialLinksService from './socialLinks.service';
import { updateSocialLinksSchema } from './socialLinks.validation';

const router = Router();
const basePath = '/websites/city-calls/social-links';

// Website: GET /public/websites/city-calls/social-links
router.get('/public/websites/city-calls/social-links', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await socialLinksService.getPublicSocialLinks(), 'Social links fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.get(basePath, authMiddleware, requirePermission('marketing', 'view'), async (_req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await socialLinksService.getSocialLinks(), 'Social links fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.put(
  basePath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateSocialLinksSchema),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await resolveActor(req.user?.sub);
      sendSuccess(res, await socialLinksService.updateSocialLinks(req.body, actor), 'Social links updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
