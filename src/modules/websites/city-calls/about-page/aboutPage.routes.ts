import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as service from './aboutPage.service';
import {
  createAboutMilestoneSchema, createAboutValueSchema, updateAboutHeroSchema, updateAboutListHeadingSchema, updateAboutMilestoneSchema,
  updateAboutParallaxSchema, updateAboutStorySchema, updateAboutValueSchema,
} from './aboutPage.validation';

// Admin → Website Section → About Page: the website's /about page.
const router = Router();
const adminPath = '/websites/city-calls/about-page';
const publicPath = '/public/websites/city-calls/about-page';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

const canView: RequestHandler[] = [authMiddleware, requirePermission('marketing', 'view')];
const canEdit: RequestHandler[] = [authMiddleware, requirePermission('marketing', 'edit')];

router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.getPublicAboutPage(), 'About page fetched successfully');
}));

// ─── Single-block sections ─────────────────────────────────────────────────
router.get(`${adminPath}/hero`, ...canView, handle(async (_req, res) => {
  sendSuccess(res, await service.getBlock('hero'), 'About hero fetched successfully');
}));
router.put(`${adminPath}/hero`, ...canEdit, validate(updateAboutHeroSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateHero(req.body, actor), 'About hero saved successfully');
}));

router.get(`${adminPath}/story`, ...canView, handle(async (_req, res) => {
  sendSuccess(res, await service.getBlock('story'), 'Our story fetched successfully');
}));
router.put(`${adminPath}/story`, ...canEdit, validate(updateAboutStorySchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateStory(req.body, actor), 'Our story saved successfully');
}));

router.get(`${adminPath}/parallax`, ...canView, handle(async (_req, res) => {
  sendSuccess(res, await service.getBlock('parallax'), 'Parallax image fetched successfully');
}));
router.put(`${adminPath}/parallax`, ...canEdit, validate(updateAboutParallaxSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateParallax(req.body, actor), 'Parallax image saved successfully');
}));

// ─── Value cards ───────────────────────────────────────────────────────────
router.get(`${adminPath}/values`, ...canView, handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminValues(), 'Values fetched successfully');
}));
router.put(`${adminPath}/values/section`, ...canEdit, validate(updateAboutListHeadingSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateValuesSection(req.body, actor), 'Heading saved successfully');
}));
router.post(`${adminPath}/values/items`, ...canEdit, validate(createAboutValueSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.createValue(req.body, actor), 'Value added successfully', null, 201);
}));
router.patch(`${adminPath}/values/items/:id`, ...canEdit, validate(updateAboutValueSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateValue(paramAsString(req.params.id), req.body, actor), 'Value updated successfully');
}));
router.delete(`${adminPath}/values/items/:id`, ...canEdit, handle(async (req, res) => {
  await service.deleteValue(paramAsString(req.params.id));
  sendSuccess(res, null, 'Value deleted successfully');
}));

// ─── Journey milestones ────────────────────────────────────────────────────
router.get(`${adminPath}/journey`, ...canView, handle(async (_req, res) => {
  sendSuccess(res, await service.getAdminJourney(), 'Journey fetched successfully');
}));
router.put(`${adminPath}/journey/section`, ...canEdit, validate(updateAboutListHeadingSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateJourneySection(req.body, actor), 'Heading saved successfully');
}));
router.post(`${adminPath}/journey/items`, ...canEdit, validate(createAboutMilestoneSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.createMilestone(req.body, actor), 'Milestone added successfully', null, 201);
}));
router.patch(`${adminPath}/journey/items/:id`, ...canEdit, validate(updateAboutMilestoneSchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateMilestone(paramAsString(req.params.id), req.body, actor), 'Milestone updated successfully');
}));
router.delete(`${adminPath}/journey/items/:id`, ...canEdit, handle(async (req, res) => {
  await service.deleteMilestone(paramAsString(req.params.id));
  sendSuccess(res, null, 'Milestone deleted successfully');
}));

export default router;
