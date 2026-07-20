import { Router } from 'express';
import { analyzePRD, streamChat, generateContent, downloadReportPDF } from '../controllers/aiController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken as any);

router.post('/analyze-prd', analyzePRD as any);
router.post('/chat', streamChat as any);
router.post('/generate-content', generateContent as any);
router.get('/reports/:id/pdf', downloadReportPDF as any);

export default router;
