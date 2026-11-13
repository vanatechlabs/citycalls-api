import { Response, NextFunction } from 'express';
import * as campaignsService from './campaigns.service';
import { sendSuccess, paramAsString } from '../../lib/apiResponse';
import { ScopedRequest } from '../../middleware/permission.middleware';
import { UnauthorizedError } from '../../lib/errors';

export async function createCampaignHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const campaign = await campaignsService.createCampaign(req.body, req.user);
    sendSuccess(res, campaign, 'Campaign created successfully', null, 201);
  } catch (err) {
    next(err);
  }
}

export async function listCampaignsHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const { items, meta } = await campaignsService.listCampaigns(req.query as never);
    sendSuccess(res, items, 'Campaigns fetched successfully', meta);
  } catch (err) {
    next(err);
  }
}

export async function getCampaignHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const campaign = await campaignsService.getCampaign(paramAsString(req.params.id));
    sendSuccess(res, campaign, 'Campaign fetched successfully');
  } catch (err) {
    next(err);
  }
}

export async function sendCampaignHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const campaign = await campaignsService.sendCampaignNow(paramAsString(req.params.id), req.user);
    sendSuccess(res, campaign, 'Campaign queued for background delivery');
  } catch (err) {
    next(err);
  }
}

export async function cancelCampaignHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try { sendSuccess(res, await campaignsService.cancelCampaign(paramAsString(req.params.id)), 'Campaign cancelled; messages already in flight may still arrive'); }
  catch (error) { next(error); }
}
export async function listCampaignRecipientsHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const { items, meta } = await campaignsService.listCampaignRecipients(paramAsString(req.params.id), page, limit);
    sendSuccess(res, items, 'Campaign recipients fetched', meta);
  } catch (error) { next(error); }
}

export async function previewCampaignAudienceHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const preview = await campaignsService.previewCampaignAudience(paramAsString(req.params.id));
    sendSuccess(res, preview, 'Campaign audience preview generated');
  } catch (err) {
    next(err);
  }
}

export async function duplicateCampaignHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const campaign = await campaignsService.duplicateCampaign(paramAsString(req.params.id), req.user);
    sendSuccess(res, campaign, 'Campaign duplicated successfully', null, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateCampaignHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    const campaign = await campaignsService.updateCampaign(paramAsString(req.params.id), req.body);
    sendSuccess(res, campaign, 'Campaign updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deleteCampaignHandler(req: ScopedRequest, res: Response, next: NextFunction) {
  try {
    await campaignsService.deleteCampaign(paramAsString(req.params.id));
    sendSuccess(res, null, 'Campaign deleted successfully');
  } catch (err) {
    next(err);
  }
}
