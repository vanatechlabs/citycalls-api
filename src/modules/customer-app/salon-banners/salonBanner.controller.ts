import { NextFunction, Response } from 'express';
import { sendSuccess, paramAsString } from '../../../lib/apiResponse';
import { ScopedRequest } from '../../../middleware/permission.middleware';
import * as salonBannerService from './salonBanner.service';

export async function listSalonBannersHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banners = await salonBannerService.listSalonBanners(req.query as never);
    sendSuccess(res, banners, 'Salon banners fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function listPublicSalonBannersHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banners = await salonBannerService.listPublicSalonBanners();
    sendSuccess(res, banners, 'Salon banners fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getSalonBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await salonBannerService.getSalonBanner(paramAsString(req.params.id));
    sendSuccess(res, banner, 'Salon banner fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createSalonBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await salonBannerService.createSalonBanner(req.body);
    sendSuccess(res, banner, 'Salon banner created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSalonBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await salonBannerService.updateSalonBanner(paramAsString(req.params.id), req.body);
    sendSuccess(res, banner, 'Salon banner updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteSalonBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await salonBannerService.deleteSalonBanner(paramAsString(req.params.id));
    sendSuccess(res, null, 'Salon banner deleted successfully');
  } catch (error) {
    next(error);
  }
}
