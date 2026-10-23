import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { sendSuccess } from '../../../../lib/apiResponse';
import { validate } from '../../../../middleware/validate.middleware';
import { SeoMetaModel } from '../../city-calls/seo/seoMeta.model';
import { pagePathSchema } from '../../city-calls/seo/seoMeta.validation';
import { helpNowSeoKey } from './helpNowSeo.pages';

// helpnow.citycalls.in reads the SEO an admin saved for one of its pages
// (Admin → SEO Manager → Add SEO Meta → "Help Now Website" group):
// GET /public/websites/help-now/seo/meta?path=/services/dish-washing
const router = Router();

const querySchema = z.object({ path: pagePathSchema }).strict();

router.get(
  '/public/websites/help-now/seo/meta',
  validate(querySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { path } = req.query as z.infer<typeof querySchema>;
      const meta = await SeoMetaModel.findOne({ pagePath: helpNowSeoKey(path), status: 'ACTIVE' })
        .select('-createdBy -updatedBy -status -__v')
        .lean();
      sendSuccess(res, meta ? { ...meta, pagePath: path } : null, 'SEO meta fetched successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
