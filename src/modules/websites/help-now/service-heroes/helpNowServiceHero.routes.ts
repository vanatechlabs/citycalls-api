import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import { HelpNowServiceSlug } from '../bookings/helpNowPricing';
import * as serviceHeroService from './helpNowServiceHero.service';
import { serviceHeroSchema, serviceHeroSlugParamSchema } from './helpNowServiceHero.validation';

// Admin → Website Section → Help Now → Service Page Hero.
const router = Router();
const adminPath = '/websites/help-now/service-heroes';

router.get(
  '/public/websites/help-now/service-heroes/:slug',
  validate(serviceHeroSlugParamSchema, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as HelpNowServiceSlug;
      sendSuccess(res, await serviceHeroService.getPublicHelpNowServiceHero(slug), 'Service hero fetched successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), async (_req: ScopedRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await serviceHeroService.listHelpNowServiceHeroes(), 'Service heroes fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.get(
  `${adminPath}/:slug`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(serviceHeroSlugParamSchema, 'params'),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      sendSuccess(res, await serviceHeroService.getHelpNowServiceHero(req.params.slug as HelpNowServiceSlug), 'Service hero fetched successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  `${adminPath}/:slug`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(serviceHeroSlugParamSchema, 'params'),
  validate(serviceHeroSchema),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      const actor = await resolveActor(req.user?.sub);
      sendSuccess(
        res,
        await serviceHeroService.saveHelpNowServiceHero(req.params.slug as HelpNowServiceSlug, req.body, actor),
        'Service hero saved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
