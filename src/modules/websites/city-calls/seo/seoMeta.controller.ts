import { NextFunction, Response } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { sendSuccess, paramAsString } from '../../../../lib/apiResponse';
import { ScopedRequest } from '../../../../middleware/permission.middleware';
import * as seoService from './seoMeta.service';

export async function listSeoPageOptionsHandler(_req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await seoService.listSeoPageOptions(), 'SEO pages fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function listSeoMetaHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await seoService.listSeoMeta(req.query as never), 'SEO entries fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getSeoMetaHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    sendSuccess(res, await seoService.getSeoMeta(paramAsString(req.params.id)), 'SEO entry fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function getPublicSeoMetaHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const { path } = req.query as { path: string };
    sendSuccess(res, await seoService.getPublicSeoMeta(path), 'SEO fetched successfully');
  } catch (error) {
    next(error);
  }
}

export async function createSeoMetaHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await seoService.createSeoMeta(req.body, actor), 'SEO entry created successfully', null, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSeoMetaHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await seoService.updateSeoMeta(paramAsString(req.params.id), req.body, actor), 'SEO entry updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deleteSeoMetaHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await seoService.deleteSeoMeta(paramAsString(req.params.id));
    sendSuccess(res, null, 'SEO entry deleted successfully');
  } catch (error) {
    next(error);
  }
}
