import { NextFunction, Request, Response, Router } from 'express';
import { resolveActor } from '../../../../lib/actor';
import { paramAsString, sendSuccess } from '../../../../lib/apiResponse';
import { authMiddleware } from '../../../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../../../middleware/permission.middleware';
import { validate } from '../../../../middleware/validate.middleware';
import * as service from './blogs.service';
import { createBlogSchema, updateBlogSchema } from './blogs.validation';

// Admin → Blog Section (Add Blog / Blog List) and the website's /blogs pages.
const router = Router();
const adminPath = '/websites/city-calls/blogs';
const publicPath = '/public/websites/city-calls/blogs';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};

// Website
router.get(publicPath, handle(async (_req, res) => {
  sendSuccess(res, await service.listPublicBlogs(), 'Blogs fetched successfully');
}));

router.get(`${publicPath}/:slug`, handle(async (req, res) => {
  sendSuccess(res, await service.getPublicBlog(paramAsString(req.params.slug)), 'Blog fetched successfully');
}));

// Admin
router.get(adminPath, authMiddleware, requirePermission('marketing', 'view'), handle(async (_req, res) => {
  sendSuccess(res, await service.listAdminBlogs(), 'Blogs fetched successfully');
}));

router.get(`${adminPath}/:id`, authMiddleware, requirePermission('marketing', 'view'), handle(async (req, res) => {
  sendSuccess(res, await service.getAdminBlog(paramAsString(req.params.id)), 'Blog fetched successfully');
}));

router.post(
  adminPath,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(createBlogSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.createBlog(req.body, actor), 'Blog created successfully', null, 201);
  })
);

router.patch(
  `${adminPath}/:id`,
  authMiddleware,
  requirePermission('marketing', 'edit'),
  validate(updateBlogSchema),
  handle(async (req, res) => {
    const actor = await resolveActor(req.user?.sub);
    sendSuccess(res, await service.updateBlog(paramAsString(req.params.id), req.body, actor), 'Blog updated successfully');
  })
);

router.delete(`${adminPath}/:id`, authMiddleware, requirePermission('marketing', 'edit'), handle(async (req, res) => {
  await service.deleteBlog(paramAsString(req.params.id));
  sendSuccess(res, null, 'Blog deleted successfully');
}));

export default router;
