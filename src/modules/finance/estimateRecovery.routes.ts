import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { EstimateModel } from './estimates.model';
import { assertFinanceAccess, assertFinanceStaff, financeFilter } from './financeAccess';
import { EstimateSyncModel, recoverEstimateStatus } from './estimateSync';
import { paramAsString, sendSuccess } from '../../lib/apiResponse';
import { NotFoundError, UnauthorizedError } from '../../lib/errors';
const router = Router();
router.get('/finance/status-recovery', authMiddleware, requirePermission('finance', 'viewFinancial'), async (req: ScopedRequest, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const estimates = await EstimateModel.find(await financeFilter(req.user)).select('_id');
    sendSuccess(res, await EstimateSyncModel.find({ estimateId: { $in: estimates.map(e => e._id) }, completedAt: { $exists: false }, attempts: { $gt: 0 } }).limit(100).sort({ nextAttemptAt: 1 }), 'Pending status updates');
  } catch (error) { next(error); }
});
router.post('/finance/status-recovery/:id/retry', authMiddleware, requirePermission('finance', 'edit'), async (req: ScopedRequest, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    assertFinanceStaff(req.user);
    const task = await EstimateSyncModel.findById(paramAsString(req.params.id));
    const estimate = task ? await EstimateModel.findById(task.estimateId) : null;
    if (!task || !estimate) throw new NotFoundError('Status update not found');
    await assertFinanceAccess(estimate, req.user);
    await recoverEstimateStatus(task.estimateId.toString());
    sendSuccess(res, await EstimateSyncModel.findById(task._id), 'Status update retried');
  } catch (error) { next(error); }
});
export default router;
