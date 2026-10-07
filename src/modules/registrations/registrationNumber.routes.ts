import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../lib/actor';
import { sendSuccess } from '../../lib/apiResponse';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  getNumberSettings, previewNextRegistrationNo, registrationNumberSettingsSchema, updateNumberSettings,
} from './registrationNumber';

// Admin Section → Settings → Registration Number series. Same access as the
// other system settings: config.view to see, config.manageSettings to change.
const router = Router();
const basePath = '/registration-number-settings';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(
  basePath,
  authMiddleware,
  requirePermission('config', 'view'),
  handle(async (_req, res) => {
    sendSuccess(res, { ...(await getNumberSettings()), nextNumber: await previewNextRegistrationNo() }, 'Settings fetched');
  })
);

router.put(
  basePath,
  authMiddleware,
  requirePermission('config', 'manageSettings'),
  validate(registrationNumberSettingsSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    const settings = await updateNumberSettings(req.body, actor);
    sendSuccess(res, { ...settings, nextNumber: await previewNextRegistrationNo() }, 'Registration number settings saved');
  })
);

export default router;
