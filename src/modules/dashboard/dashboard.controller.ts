import { Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';
import { sendSuccess } from '../../lib/apiResponse';
import { ScopedRequest } from '../../middleware/permission.middleware';
import { UnauthorizedError } from '../../lib/errors';

export async function getRangeStatsHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.scope) throw new UnauthorizedError();
    const query = req.query as { startDate?: Date; endDate?: Date };
    const data = await dashboardService.getRangeStats(req.scope, req.user, query);
    sendSuccess(res, data, 'Dashboard range stats fetched successfully');
  } catch (err) {
    next(err);
  }
}
