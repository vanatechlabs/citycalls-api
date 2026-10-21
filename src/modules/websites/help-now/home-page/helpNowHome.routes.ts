import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { sendSuccess } from '../../../../lib/apiResponse';
import { ValidationError } from '../../../../lib/errors';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as helpNowHomeService from './helpNowHome.service';
import { HELP_NOW_HOME_SCHEMAS, HelpNowHomeSection, helpNowHomeSectionParamSchema } from './helpNowHome.validation';

// Admin → Website Section → Help Now: hero carousel, marquee strip, About and
// service cards of the helpnow.citycalls.in home page.
const router = Router();
const adminPath = '/websites/help-now/home-page/:section';
const publicPath = '/public/websites/help-now/home-page';

router.get(publicPath, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await helpNowHomeService.getPublicHelpNowHome(), 'Help Now home page fetched successfully');
  } catch (error) {
    next(error);
  }
});

router.get(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(helpNowHomeSectionParamSchema, 'params'),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      const section = req.params.section as HelpNowHomeSection;
      sendSuccess(res, await helpNowHomeService.getHelpNowHomeSection(section), 'Section fetched successfully');
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(helpNowHomeSectionParamSchema, 'params'),
  async (req: ScopedRequest, res: Response, next: NextFunction) => {
    try {
      const section = req.params.section as HelpNowHomeSection;
      // Each section has its own shape, so the body is checked here.
      const parsed = HELP_NOW_HOME_SCHEMAS[section].safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'general',
          code: 'INVALID',
          message: issue.message,
        })));
      }
      const actor = await resolveActor(req.user?.sub);
      sendSuccess(
        res,
        await helpNowHomeService.updateHelpNowHomeSection(section, parsed.data as never, actor),
        'Section saved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
