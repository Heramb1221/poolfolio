import prisma from '../../config/prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors';
import { AccountingService } from '../../services/accounting.service';
import { TransactionService } from '../../services/transaction.service';
import { InvestmentPDFBuilder } from './report.pdf';

export class ReportService {
  private accountingService: AccountingService;
  private transactionService: TransactionService;

  constructor() {
    this.accountingService = new AccountingService();
    this.transactionService = new TransactionService();
  }

  /**
   * Generates a complete investment PDF report buffer.
   * Feeds authoritative figures directly from the accounting engine.
   */
  public async generateInvestmentPDF(
    investmentId: string,
    userId: string,
    currentPrice?: string
  ): Promise<{
    buffer: Buffer;
    fileName: string;
  }> {
    // 1. Verify investment & group access
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        group: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    if (investment.group.members.length === 0) {
      throw new ForbiddenError('You do not belong to the group associated with this investment');
    }

    // 2. Authoritative summary from accounting service
    const summary = await this.accountingService.getInvestmentSummary(
      investmentId,
      userId,
      currentPrice
    );

    // 3. Transactions ledger history
    const { transactions } = await this.transactionService.getInvestmentTransactions(
      investmentId,
      userId,
      {}
    );

    // 4. Generate PDF buffer
    const buffer = await InvestmentPDFBuilder.build({
      groupName: investment.group.name,
      summary,
      transactions,
    });

    const safeDate = new Date().toISOString().split('T')[0];
    const safeSymbol = investment.symbol.replace(/[^A-Za-z0-9_-]/g, '');
    const fileName = `Poolfolio_${safeSymbol}_Report_${safeDate}.pdf`;

    return {
      buffer,
      fileName,
    };
  }
}

export const reportService = new ReportService();
