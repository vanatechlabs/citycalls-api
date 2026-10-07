import { NextFunction, Response } from 'express';
import { sendSuccess, paramAsString } from '../../../lib/apiResponse';
import { ScopedRequest } from '../../../middleware/permission.middleware';
import * as helpNowBannerService from './helpNowBanner.service';

export async function listHelpNowBannersHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banners = await helpNowBannerService.listHelpNowBanners(req.query as never);
    sendSuccess(res, banners, 'HelpNow banners fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function listPublicHelpNowBannersHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banners = await helpNowBannerService.listPublicHelpNowBanners();
    sendSuccess(res, banners, 'HelpNow banners fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getHelpNowBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await helpNowBannerService.getHelpNowBanner(paramAsString(req.params.id));
    sendSuccess(res, banner, 'HelpNow banner fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createHelpNowBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await helpNowBannerService.createHelpNowBanner(req.body);
    sendSuccess(res, banner, 'HelpNow banner created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateHelpNowBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await helpNowBannerService.updateHelpNowBanner(paramAsString(req.params.id), req.body);
    sendSuccess(res, banner, 'HelpNow banner updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteHelpNowBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await helpNowBannerService.deleteHelpNowBanner(paramAsString(req.params.id));
    sendSuccess(res, null, 'HelpNow banner deleted successfully');
  } catch (error) {
    next(error);
  }
}
