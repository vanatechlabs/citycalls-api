import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../../lib/apiResponse';
import { authMiddleware } from '../../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../../middleware/permission.middleware';
import { validate } from '../../../../../middleware/validate.middleware';
import * as service from './popularPackages.service';
import { createPackageSchema, updatePackageSchema, updatePackagesSectionSchema } from './popularPackages.validation';

// Admin → Website Section → Popular Packages: the home page's package cards
// and the heading above them.
const router = Router();
const adminPath = '/websites/city-calls/home-page/popular-packages';
const publicPath = '/public/websites/city-calls/home-page/popular-packages';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.getPublicPopularPackages(), 'Popular packages fetched successfully');
}));

router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminPopularPackages(), 'Popular packages fetched successfully');
}));

router.put(
  `${adminPath}/section`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updatePackagesSectionSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updatePackagesSection(req.body, actor), 'Section heading updated successfully');
  })
);

router.post(
  `${adminPath}/items`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createPackageSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createPackage(req.body, actor), 'Package added successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updatePackageSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updatePackage(paramAsString(req.params.id), req.body, actor), 'Package updated successfully');
  })
);

router.delete(
  `${adminPath}/items/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  handle(async (req, res) => {
    await service.deletePackage(paramAsString(req.params.id));
    sendSuccess(res, null, 'Package deleted successfully');
  })
);

export default router;
