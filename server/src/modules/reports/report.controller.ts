import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { UnauthorizedError } from '../../utils/errors';

export class ReportController {
  /**
   * GET /api/investments/:investmentId/report
   * Generates and downloads the authoritative PDF investment report.
   */
  public async getInvestmentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { investmentId } = req.params;
      const currentPrice = req.query.currentPrice as string | undefined;

      const { buffer, fileName } = await reportService.generateInvestmentPDF(
        investmentId,
        req.user.id,
        currentPrice
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
