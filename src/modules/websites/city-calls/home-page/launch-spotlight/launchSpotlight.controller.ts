import { NextFunction, Response } from 'express';
import { sendSuccess } from '../../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../../middleware/permission.middleware';
import * as launchSpotlightService from './launchSpotlight.service';

export async function getLaunchSpotlightHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const config = await launchSpotlightService.getLaunchSpotlight();
    sendSuccess(res, config, 'Launch spotlight fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getPublicLaunchSpotlightHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const slides = await launchSpotlightService.getPublicLaunchSpotlight();
    sendSuccess(res, slides, 'Launch spotlight fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateLaunchSpotlightHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const config = await launchSpotlightService.updateLaunchSpotlight(req.body.slides);
    sendSuccess(res, config, 'Launch spotlight updated successfully');
  } catch (error) {
    next(error);
  }
}
