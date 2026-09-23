import { NextFunction, Response } from 'express';
import { sendSuccess, paramAsString } from '../../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../../middleware/permission.middleware';
import * as heroSlideService from './heroSlide.service';

export async function listHeroSlidesHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const slides = await heroSlideService.listHeroSlides(req.query as never);
    sendSuccess(res, slides, 'Hero slides fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function listPublicHeroSlidesHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const slides = await heroSlideService.listPublicHeroSlides();
    sendSuccess(res, slides, 'Hero slides fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getHeroSlideHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const slide = await heroSlideService.getHeroSlide(paramAsString(req.params.id));
    sendSuccess(res, slide, 'Hero slide fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createHeroSlideHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const slide = await heroSlideService.createHeroSlide(req.body);
    sendSuccess(res, slide, 'Hero slide created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateHeroSlideHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const slide = await heroSlideService.updateHeroSlide(paramAsString(req.params.id), req.body);
    sendSuccess(res, slide, 'Hero slide updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteHeroSlideHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await heroSlideService.deleteHeroSlide(paramAsString(req.params.id));
    sendSuccess(res, null, 'Hero slide deleted successfully');
  } catch (error) {
    next(error);
  }
}
