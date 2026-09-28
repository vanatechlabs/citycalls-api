import { NextFunction, Response } from 'express';
import { paramAsString, sendSuccess } from '../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../middleware/permission.middleware';
import * as servicePageService from './servicePage.service';

export async function listServicePageOptionsHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const options = await servicePageService.listServicePageOptions();
    sendSuccess(res, options, 'Service page options fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getServicePageHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const page = await servicePageService.getServicePageByNavService(paramAsString(req.params.serviceId));
    sendSuccess(res, page, 'Service page fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function upsertServicePageHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const page = await servicePageService.upsertServicePage(paramAsString(req.params.serviceId), req.body);
    sendSuccess(res, page, 'Service page saved successfully');
  } catch (error) {
    next(error);
  }
}

export async function getPublicServicePageHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const page = await servicePageService.getPublicServicePage(paramAsString(req.params.slug));
    res.set('Cache-Control', 'no-store');
    sendSuccess(res, page, 'Service page fetched successfully');
  } catch (error) {
    next(error);
  }
}
