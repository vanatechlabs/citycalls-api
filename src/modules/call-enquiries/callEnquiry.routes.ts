import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { resolveActor } from '../../lib/actor';
import { paramAsString, sendSuccess } from '../../lib/apiResponse';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as service from './callEnquiry';

// Call Enquiry Section → Add Call Enquiry / Call Enquiry List. Same access as
// the Service Call (registration) screens: the Customers module.
const router = Router();
const basePath = '/call-enquiries';

type Handler = (req: ScopedRequest, res: Response) => Promise<void>;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req as ScopedRequest, res).catch(next);
};
const can = (action: 'view' | 'create' | 'edit'): RequestHandler[] => [authMiddleware, requirePermission('customers', action)];

router.get(basePath, ...can('view'), handle(async (_req, res) => {
  sendSuccess(res, await service.listCallEnquiries(), 'Call enquiries fetched successfully');
}));
router.get(`${basePath}/:id`, ...can('view'), handle(async (req, res) => {
  sendSuccess(res, await service.getCallEnquiry(paramAsString(req.params.id)), 'Call enquiry fetched successfully');
}));
router.post(basePath, ...can('create'), validate(service.createCallEnquirySchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.createCallEnquiry(req.body, actor), 'Call enquiry added successfully', null, 201);
}));
router.patch(`${basePath}/:id`, ...can('edit'), validate(service.updateCallEnquirySchema), handle(async (req, res) => {
  const actor = await resolveActor(req.user?.sub);
  sendSuccess(res, await service.updateCallEnquiry(paramAsString(req.params.id), req.body, actor), 'Call enquiry updated successfully');
}));
router.delete(`${basePath}/:id`, ...can('edit'), handle(async (req, res) => {
  await service.deleteCallEnquiry(paramAsString(req.params.id));
  sendSuccess(res, null, 'Call enquiry deleted successfully');
}));

export default router;
