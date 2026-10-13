import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import { getPublicSiteSettings, getSiteSettings, siteSettingsSchema, updateSiteSettings } from './siteSettings';

// Admin Section → Settings → Website look. Same access as the other system
// settings: config.view to see, config.manageSettings to change.
const router = Router();
const adminPath = '/websites/city-calls/site-settings';
const publicPath = '/public/websites/city-calls/site-settings';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await getPublicSiteSettings(), 'Site settings fetched');
}));

router.get(adminPath, authMiddleware, requirePermission('config', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await getSiteSettings(), 'Site settings fetched');
}));

router.put(
  adminPath,
  authMiddleware,
  requirePermission('config', 'manageSettings'),
  validate(siteSettingsSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await updateSiteSettings(req.body, actor), 'Site settings saved');
  })
);

export default router;
