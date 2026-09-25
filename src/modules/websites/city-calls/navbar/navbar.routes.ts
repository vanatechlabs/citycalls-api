import { Router } from 'express';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as controller from './navbar.controller';
import {
  createNavbarMenuSchema,
  updateNavbarMenuSchema,
  navbarMenuIdParamSchema,
  createNavbarServiceSchema,
  updateNavbarServiceSchema,
} from './navbar.validation';

const router = Router();
const menusPath = '/websites/city-calls/navbar/menus';
const servicesPath = '/websites/city-calls/navbar/services';
const publicPath = '/public/websites/city-calls/navbar/menus';

router.get(publicPath, controller.listPublicNavbarMenusHandler);

// Menus
router.get(menusPath, authMiddleware, requirePermission('marketing', 'view'), controller.listNavbarMenusHandler);
router.get(
  `${menusPath}/:menuId`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(navbarMenuIdParamSchema, 'params'),
  controller.getNavbarMenuHandler
);
router.post(
  menusPath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createNavbarMenuSchema),
  controller.createNavbarMenuHandler
);
router.patch(
  `${menusPath}/:menuId`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(navbarMenuIdParamSchema, 'params'),
  validate(updateNavbarMenuSchema),
  controller.updateNavbarMenuHandler
);
router.delete(
  `${menusPath}/:menuId`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(navbarMenuIdParamSchema, 'params'),
  controller.deleteNavbarMenuHandler
);

// Services (navlinks) — scoped under a menu for listing/creating, flat by id for edit/delete.
router.get(
  `${menusPath}/:menuId/services`,
  authMiddleware,
  requirePermission('marketing', 'view'),
  validate(navbarMenuIdParamSchema, 'params'),
  controller.listNavbarServicesHandler
);
router.post(
  servicesPath,
  authMiddleware,
  requirePermission('marketing', 'create'),
  validate(createNavbarServiceSchema),
  controller.createNavbarServiceHandler
);
router.patch(
  `${servicesPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateNavbarServiceSchema),
  controller.updateNavbarServiceHandler
);
router.delete(`${servicesPath}/:id`, authMiddleware, requirePermission('marketing', 'edit'), controller.deleteNavbarServiceHandler);

export default router;
