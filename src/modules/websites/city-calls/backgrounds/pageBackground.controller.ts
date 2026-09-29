import { NextFunction, Response } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { sendSuccess, paramAsString } from '../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../middleware/permission.middleware';
import * as backgroundService from './pageBackground.service';

export async function listBackgroundPageOptionsHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await backgroundService.listBackgroundPageOptions(), 'Background pages fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function listPageBackgroundsHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await backgroundService.listPageBackgrounds(req.query as never), 'Backgrounds fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getPageBackgroundHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await backgroundService.getPageBackground(paramAsString(req.params.id)), 'Background fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getPublicPageBackgroundHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const { path } = req.query as { path: string };
    sendSuccess(res, await backgroundService.getPublicPageBackground(path), 'Background fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createPageBackgroundHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await backgroundService.createPageBackground(req.body, actor), 'Background created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updatePageBackgroundHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(
      res,
      await backgroundService.updatePageBackground(paramAsString(req.params.id), req.body, actor),
      'Background updated successfully'
    );
  } catch (error) {
    next(error);
  }
}

export async function deletePageBackgroundHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await backgroundService.deletePageBackground(paramAsString(req.params.id));
    sendSuccess(res, null, 'Background deleted successfully');
  } catch (error) {
    next(error);
  }
}
