import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission, ScopedRequest } from '../../middleware/permission.middleware';
import { authorizeDocument, generateDocumentPdf, renderFinancialPdf, verifyDocumentToken } from '../../lib/pdfGenerator';
import { paramAsString, sendSuccess } from '../../lib/apiResponse';
import { UnauthorizedError } from '../../lib/errors';

const router = Router();
router.get('/financial-documents/:type/:id/download', authMiddleware, requirePermission('finance', 'view'), async (req: ScopedRequest, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const type = paramAsString(req.params.type), id = paramAsString(req.params.id);
    await authorizeDocument(type, id, req.user);
    sendSuccess(res, { url: await generateDocumentPdf(type, id) }, 'Download ready');
  } catch (error) { next(error); }
});
router.get('/financial-documents/:type/:id.pdf', async (req, res, next) => {
  try {
    const type = paramAsString(req.params.type), id = paramAsString(req.params.id);
    verifyDocumentToken(type, id, typeof req.query.token === 'string' ? req.query.token : '');
    const bytes = await renderFinancialPdf(type, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-${id}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(bytes);
  } catch (error) { next(error); }
});
export default router;
