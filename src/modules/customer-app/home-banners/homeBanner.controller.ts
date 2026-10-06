import { NextFunction, Response } from 'express';
import { sendSuccess, paramAsString } from '../../../lib/apiResponse';
import { ScopedRequest } from '../../../middleware/permission.middleware';
import * as homeBannerService from './homeBanner.service';

export async function listHomeBannersHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banners = await homeBannerService.listHomeBanners(req.query as never);
    sendSuccess(res, banners, 'Home banners fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function listPublicHomeBannersHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banners = await homeBannerService.listPublicHomeBanners();
    sendSuccess(res, banners, 'Home banners fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getHomeBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await homeBannerService.getHomeBanner(paramAsString(req.params.id));
    sendSuccess(res, banner, 'Home banner fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createHomeBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await homeBannerService.createHomeBanner(req.body);
    sendSuccess(res, banner, 'Home banner created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateHomeBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const banner = await homeBannerService.updateHomeBanner(paramAsString(req.params.id), req.body);
    sendSuccess(res, banner, 'Home banner updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteHomeBannerHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await homeBannerService.deleteHomeBanner(paramAsString(req.params.id));
    sendSuccess(res, null, 'Home banner deleted successfully');
  } catch (error) {
    next(error);
  }
}
