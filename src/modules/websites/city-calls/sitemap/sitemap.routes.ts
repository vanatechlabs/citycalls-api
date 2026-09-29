import { NextFunction, Request, Response, Router } from 'express';
import { sendSuccess } from '../../../../lib/apiResponse';
import { getSitemapEntries } from './sitemap.service';

const router = Router();

// Website: GET /public/websites/city-calls/sitemap → [{ path, lastModified }]
router.get('/public/websites/city-calls/sitemap', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getSitemapEntries(), 'Sitemap fetched successfully');
  } catch (error) {
    next(error);
  }
});

export default router;
