import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import { confirmExtractionSchema, extractDocumentSchema, uploadDocumentSchema } from './schemas';
import { UnauthorizedError } from '../../utils/errors';

export class AIController {
  /**
   * POST /api/ai/documents
   * Uploads and registers a document for extraction.
   */
  public async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const validatedInput = uploadDocumentSchema.parse(req.body);
      const userId = req.user.id;

      const document = await aiService.uploadDocument(userId, validatedInput);

      res.status(201).json({
        success: true,
        data: document,
        message: 'Document uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/documents/:documentId/extract
   * Runs Gemma extraction on the specified document.
   */
  public async extractDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { documentId } = req.params;
      const options = extractDocumentSchema.parse(req.body);
      const userId = req.user.id;

      const extraction = await aiService.extractDocument(documentId, userId, options);

      res.status(200).json({
        success: true,
        data: extraction,
        message: 'Document extracted successfully. Please review the proposed records before confirming.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ai/documents/:documentId
   * Retrieve document details with past extractions.
   */
  public async getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { documentId } = req.params;
      const userId = req.user.id;

      const document = await aiService.getDocumentById(documentId, userId);

      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ai/extractions/:extractionId
   * Retrieve single extraction details.
   */
  public async getExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { extractionId } = req.params;
      const userId = req.user.id;

      const extraction = await aiService.getExtractionById(extractionId, userId);

      res.status(200).json({
        success: true,
        data: extraction,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/extractions/:extractionId/confirm
   * Confirms the extracted data and writes an authoritative entry to the financial ledger.
   */
  public async confirmExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { extractionId } = req.params;
      const validatedInput = confirmExtractionSchema.parse(req.body);
      const userId = req.user.id;

      const result = await aiService.confirmExtraction(extractionId, userId, validatedInput);

      res.status(200).json({
        success: true,
        data: result,
        message: 'AI Extraction confirmed and transaction recorded into authoritative ledger',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/extractions/:extractionId/reject
   * Rejects the proposed extraction without modifying the ledger.
   */
  public async rejectExtraction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const { extractionId } = req.params;
      const userId = req.user.id;

      const result = await aiService.rejectExtraction(extractionId, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'AI Extraction rejected',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
