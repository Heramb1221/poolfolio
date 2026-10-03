import PDFDocument from 'pdfkit';
import { InvestmentAccountingSummary } from '../../types/accounting';
import { SafeTransaction } from '../../types/transaction';

export interface PDFReportData {
  groupName: string;
  summary: InvestmentAccountingSummary;
  transactions: SafeTransaction[];
}

export class InvestmentPDFBuilder {
  /**
   * Generates a binary PDF buffer containing the complete investment report.
   * Uses authoritative figures directly from the accounting engine without any recalculations.
   */
  public static async build(data: PDFReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Poolfolio Report - ${data.summary.investment.symbol}`,
          Author: 'Poolfolio Accounting Engine',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const { summary, groupName, transactions } = data;
      const inv = summary.investment;
      const cap = summary.capital;
      const perf = summary.performance;
      const tr = summary.trading;
      const ipo = summary.ipo;

      // Primary Colors
      const primaryColor = '#1e3a8a'; // Deep Navy
      const darkColor = '#0f172a';
      const mutedColor = '#64748b';
      const successColor = '#16a34a';
      const dangerColor = '#dc2626';

      // 1. Header & Title
      doc
        .fontSize(22)
        .fillColor(primaryColor)
        .text('POOLFOLIO', { continued: true })
        .fontSize(12)
        .fillColor(mutedColor)
        .text('   |   GROUP INVESTMENT REPORT', { align: 'right' });

      doc.moveDown(0.2);
      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      doc.moveDown(0.8);

      // 2. Investment Overview Block
      doc.fontSize(16).fillColor(darkColor).text(inv.name);
      doc
        .fontSize(10)
        .fillColor(mutedColor)
        .text(`Symbol: ${inv.symbol}   |   Type: ${inv.type}   |   Group: ${groupName}   |   Status: ${inv.status}`);

      doc.moveDown(0.4);
      const datesText = [
        inv.startDate ? `Started: ${new Date(inv.startDate).toLocaleDateString()}` : null,
        inv.lockDate ? `Locked: ${new Date(inv.lockDate).toLocaleDateString()}` : null,
        inv.endDate ? `Settled: ${new Date(inv.endDate).toLocaleDateString()}` : null,
      ]
        .filter(Boolean)
        .join('    •    ');

      if (datesText) {
        doc.fontSize(9).fillColor(mutedColor).text(datesText);
      }

      doc.moveDown(0.8);

      // 3. Financial Performance Summary (Authoritative values)
      doc.fontSize(12).fillColor(primaryColor).text('FINANCIAL PERFORMANCE SUMMARY');
      doc.moveDown(0.3);

      const netPnlNum = parseFloat(perf.netPnl);
      const isPositive = netPnlNum >= 0;
      const pnlColor = isPositive ? successColor : dangerColor;

      // Draw Key Metric Boxes
      const boxY = doc.y;
      const boxWidth = 115;
      const boxHeight = 45;

      const drawMetricBox = (x: number, title: string, value: string, valColor: string = darkColor) => {
        doc
          .rect(x, boxY, boxWidth, boxHeight)
          .fillAndStroke('#f8fafc', '#e2e8f0');
        doc
          .fontSize(8)
          .fillColor(mutedColor)
          .text(title, x + 8, boxY + 8, { width: boxWidth - 16 });
        doc
          .fontSize(11)
          .fillColor(valColor)
          .text(value, x + 8, boxY + 24, { width: boxWidth - 16 });
      };

      drawMetricBox(40, 'TOTAL CAPITAL', `INR ${cap.totalContributions}`);
      drawMetricBox(160, 'TOTAL BOUGHT', `INR ${tr.totalBoughtAmount}`);
      drawMetricBox(280, 'COST BASIS REMAINING', `INR ${tr.costBasisRemaining}`);
      drawMetricBox(400, 'NET P&L (ROI)', `${isPositive ? '+' : ''}${perf.netPnl} (${perf.returnPercentage})`, pnlColor);

      doc.y = boxY + boxHeight + 15;

      // 4. Stock Trading & Fee Deductions Breakdown
      doc
        .fontSize(9)
        .fillColor(mutedColor)
        .text(
          `Shares Bought: ${tr.totalBoughtShares} (Avg: INR ${tr.avgBuyPrice})   |   Shares Sold: ${tr.totalSoldShares} (Avg: INR ${tr.avgSellPrice})   |   Remaining Held: ${tr.currentSharesHeld}`
        );
      doc
        .fontSize(9)
        .fillColor(mutedColor)
        .text(
          `Dividends: +INR ${perf.totalDividends}   |   Brokerage & Fees: -INR ${perf.totalFees}   |   Taxes: -INR ${perf.totalTaxes}`
        );

      doc.moveDown(0.6);

      // 5. IPO Specific Metrics (if applicable)
      if (ipo) {
        doc
          .rect(40, doc.y, 515, 30)
          .fillAndStroke('#eff6ff', '#bfdbfe');
        doc
          .fontSize(9)
          .fillColor(primaryColor)
          .text(
            `IPO Metrics:  Applied: INR ${ipo.appliedAmount}   |   Allocated Capital: INR ${ipo.allottedAmount}   |   Refunded to Pool: INR ${ipo.refundAmount}`,
            50,
            doc.y - 20
          );
        doc.moveDown(0.8);
      }

      // 6. Member Allocation & Settlement Roster
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(primaryColor).text('MEMBER CAPITAL ALLOCATION & SETTLEMENT');
      doc.moveDown(0.3);

      // Table Header
      let currentY = doc.y;
      doc.rect(40, currentY, 515, 20).fill('#f1f5f9');
      doc.fontSize(8).fillColor(darkColor);
      doc.text('MEMBER', 48, currentY + 6);
      doc.text('LOCKED CAPITAL', 180, currentY + 6);
      doc.text('OWNERSHIP', 280, currentY + 6);
      doc.text('NET ALLOCATED P&L', 360, currentY + 6);
      doc.text('FINAL PAYOUT', 460, currentY + 6);

      currentY += 22;

      for (const m of summary.members) {
        if (currentY > 750) {
          doc.addPage();
          currentY = 40;
        }

        const memPnl = parseFloat(m.netAllocatedPnl);
        const memPnlColor = memPnl >= 0 ? successColor : dangerColor;

        doc.fontSize(8).fillColor(darkColor).text(m.userName, 48, currentY + 4);
        doc.fontSize(8).fillColor(mutedColor).text(`INR ${m.lockedContribution}`, 180, currentY + 4);
        doc.fontSize(8).fillColor(mutedColor).text(m.ownershipPercentage, 280, currentY + 4);
        doc.fontSize(8).fillColor(memPnlColor).text(`${memPnl >= 0 ? '+' : ''}${m.netAllocatedPnl}`, 360, currentY + 4);
        doc.fontSize(8).fillColor(darkColor).text(`INR ${m.projectedSettlement}`, 460, currentY + 4);

        currentY += 18;
        doc
          .strokeColor('#f1f5f9')
          .lineWidth(0.5)
          .moveTo(40, currentY)
          .lineTo(555, currentY)
          .stroke();
      }

      doc.y = currentY + 15;

      // 7. Transaction Ledger (Recent History)
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.moveDown(0.5);
      doc.fontSize(12).fillColor(primaryColor).text('TRANSACTION LEDGER HISTORY');
      doc.moveDown(0.3);

      let txY = doc.y;
      doc.rect(40, txY, 515, 20).fill('#f1f5f9');
      doc.fontSize(8).fillColor(darkColor);
      doc.text('DATE', 48, txY + 6);
      doc.text('TYPE', 120, txY + 6);
      doc.text('QTY / RATE', 200, txY + 6);
      doc.text('AMOUNT', 310, txY + 6);
      doc.text('REFERENCE / NOTES', 410, txY + 6);

      txY += 22;

      for (const t of transactions.slice(0, 15)) {
        if (txY > 750) {
          doc.addPage();
          txY = 40;
        }

        const dateStr = new Date(t.transactionDate).toLocaleDateString();
        const qtyRate = t.quantity && t.price ? `${t.quantity} @ ${t.price}` : '-';

        doc.fontSize(8).fillColor(mutedColor).text(dateStr, 48, txY + 4);
        doc.fontSize(8).fillColor(darkColor).text(t.type, 120, txY + 4);
        doc.fontSize(8).fillColor(mutedColor).text(qtyRate, 200, txY + 4);
        doc.fontSize(8).fillColor(darkColor).text(`INR ${t.amount}`, 310, txY + 4);
        doc.fontSize(8).fillColor(mutedColor).text((t.reference || t.notes || '-').slice(0, 25), 410, txY + 4);

        txY += 18;
        doc
          .strokeColor('#f1f5f9')
          .lineWidth(0.5)
          .moveTo(40, txY)
          .lineTo(555, txY)
          .stroke();
      }

      // 8. Footer / Disclaimer
      doc.y = Math.max(txY + 25, 780);
      if (doc.y > 800) {
        doc.addPage();
        doc.y = 780;
      }

      doc
        .fontSize(7)
        .fillColor(mutedColor)
        .text(
          'Authoritative calculations produced deterministically by Poolfolio Accounting Engine. Values represent pooled capital and settlement payouts under group agreed ownership. Not an official broker confirmation.',
          40,
          doc.y,
          { align: 'center', width: 515 }
        );

      doc.end();
    });
  }
}
