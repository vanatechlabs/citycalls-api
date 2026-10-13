import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  createCustomerSchema,
  updateCustomerSchema,
  addAddressSchema,
  updateAddressSchema,
  addProductSchema,
  updateConsentSchema,
  fcmTokenSchema,
  listCustomersQuerySchema,
} from './customers.validation';
import * as ctrl from './customers.controller';

const router = Router();

router.get('/customers', authMiddleware, requirePermission('customers', 'view'), validate(listCustomersQuerySchema, 'query'), ctrl.listCustomersHandler);
router.get('/customers/duplicates', authMiddleware, requirePermission('customers', 'view'), ctrl.findDuplicatesHandler);
router.get('/customers/me', authMiddleware, ctrl.getOwnCustomerHandler);
router.patch('/customers/me', authMiddleware, validate(updateCustomerSchema), ctrl.updateOwnCustomerHandler);
router.post('/customers/me/addresses', authMiddleware, validate(addAddressSchema), ctrl.addOwnAddressHandler);
router.patch('/customers/me/addresses/:addressId', authMiddleware, validate(updateAddressSchema), ctrl.updateOwnAddressHandler);
router.delete('/customers/me/addresses/:addressId', authMiddleware, ctrl.deleteOwnAddressHandler);
router.get('/customers/me/products', authMiddleware, ctrl.listOwnProductsHandler);
router.post('/customers/me/products', authMiddleware, validate(addProductSchema), ctrl.addOwnProductHandler);
router.patch('/customers/me/consent', authMiddleware, validate(updateConsentSchema), ctrl.updateOwnConsentHandler);
router.get('/customers/:id', authMiddleware, requirePermission('customers', 'view'), ctrl.getCustomerHandler);
router.post('/customers', authMiddleware, requirePermission('customers', 'create'), validate(createCustomerSchema), ctrl.createCustomerHandler);
router.patch('/customers/:id', authMiddleware, requirePermission('customers', 'edit'), validate(updateCustomerSchema), ctrl.updateCustomerHandler);
router.delete('/customers/:id', authMiddleware, requirePermission('customers', 'edit'), ctrl.deleteCustomerHandler);
router.post('/customers/:id/addresses', authMiddleware, requirePermission('customers', 'edit'), validate(addAddressSchema), ctrl.addAddressHandler);
router.patch('/customers/:id/addresses/:addressId', authMiddleware, requirePermission('customers', 'edit'), validate(updateAddressSchema), ctrl.updateAddressHandler);
router.delete('/customers/:id/addresses/:addressId', authMiddleware, requirePermission('customers', 'edit'), ctrl.deleteAddressHandler);
router.get('/customers/:id/history', authMiddleware, requirePermission('customers', 'view'), ctrl.getCustomerHistoryHandler);
router.get('/customers/:id/products', authMiddleware, requirePermission('customers', 'view'), ctrl.listProductsHandler);
router.post('/customers/:id/products', authMiddleware, requirePermission('customers', 'edit'), validate(addProductSchema), ctrl.addProductHandler);
router.patch('/customers/:id/consent', authMiddleware, requirePermission('customers', 'edit'), validate(updateConsentSchema), ctrl.updateConsentHandler);
router.post('/customers/me/fcm-token', authMiddleware, validate(fcmTokenSchema), ctrl.registerFcmTokenHandler);
router.delete('/customers/me/fcm-token', authMiddleware, validate(fcmTokenSchema), ctrl.unregisterFcmTokenHandler);

export default router;
