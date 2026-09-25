import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import { rangeStatsQuerySchema } from './dashboard.validation';
import * as ctrl from './dashboard.controller';

const router = Router();

// Powers the dashboard's TODAY / THIS WEEK / CUSTOM DATE panel.
router.get(
  '/dashboard/range-stats',
  authMiddleware,
  requirePermission('reports', 'view'),
  validate(rangeStatsQuerySchema, 'query'),
  ctrl.getRangeStatsHandler
);

export default router;
