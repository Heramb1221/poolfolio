import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { aiController } from './ai.controller';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// Document endpoints
router.post('/documents', (req, res, next) => aiController.uploadDocument(req, res, next));
router.get('/documents/:documentId', (req, res, next) => aiController.getDocument(req, res, next));
router.post('/documents/:documentId/extract', (req, res, next) => aiController.extractDocument(req, res, next));

// Extraction endpoints
router.get('/extractions/:extractionId', (req, res, next) => aiController.getExtraction(req, res, next));
router.post('/extractions/:extractionId/confirm', (req, res, next) => aiController.confirmExtraction(req, res, next));
router.post('/extractions/:extractionId/reject', (req, res, next) => aiController.rejectExtraction(req, res, next));

export default router;
