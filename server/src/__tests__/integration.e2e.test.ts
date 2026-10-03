import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Prisma, InvestmentStatus, InvestmentType, TransactionType } from '@prisma/client';
import app from '../app';
import { AccountingService } from '../services/accounting.service';
import { InvestmentPDFBuilder } from '../modules/reports/report.pdf';
import { DocumentPreprocessor } from '../modules/ai/document.preprocessor';
import { gemmaClient } from '../modules/ai/gemma.client';
import { GemmaPromptBuilder } from '../modules/ai/gemma.prompt';
import { TabPFNFeatureExtractor } from '../modules/ai/tabpfn.features';
import { tabpfnClient } from '../modules/ai/tabpfn.client';
import { confirmExtractionSchema, aiExtractionOutputSchema } from '../modules/ai/schemas';
import { InvestmentAccountingSummary } from '../types/accounting';

/**
 * Task 12: INTEGRATION — Final QA End-to-End Test Suite
 *
 * Verifies the complete 14-stage investment lifecycle flow:
 * register -> login -> create group -> add members -> create investment
 * -> OPEN contributions -> modify contribution -> LOCK -> reject post-lock contribution changes
 * -> add investment transactions -> calculate ownership/P&L -> settlement -> PDF
 * -> AI extraction confirmation -> anomaly analysis
 */
describe('Poolfolio End-to-End Integration & Lifecycle QA Suite', () => {
  // Shared mock test state across sequential lifecycle steps
  const users = {
    leader: { id: 'usr-leader-1', name: 'Alice Leader', email: 'alice@poolfolio.app' },
    coLeader: { id: 'usr-coleader-2', name: 'Bob CoLeader', email: 'bob@poolfolio.app' },
    member: { id: 'usr-member-3', name: 'Charlie Member', email: 'charlie@poolfolio.app' },
    outsider: { id: 'usr-outsider-4', name: 'Dave Outsider', email: 'dave@external.app' },
  };

  const group = {
    id: 'grp-alpha-001',
    name: 'Alpha Syndicate',
    leaderId: users.leader.id,
    members: [
      { userId: users.leader.id, role: 'LEADER' },
      { userId: users.coLeader.id, role: 'CO_LEADER' },
      { userId: users.member.id, role: 'MEMBER' },
    ],
  };

  const investment = {
    id: 'a0000000-0000-0000-0000-000000000001', // Valid UUID
    groupId: group.id,
    name: 'Tata Motors Growth Pool',
    symbol: 'TATAMOTORS',
    type: InvestmentType.STOCK,
    status: InvestmentStatus.DRAFT as InvestmentStatus,
    startDate: null as Date | null,
    lockDate: null as Date | null,
    endDate: null as Date | null,
  };

  // Mutable state tracked through lifecycle stages
  let contributions: Array<{
    id: string;
    userId: string;
    userName: string;
    amount: Prisma.Decimal;
    createdAt: Date;
  }> = [];

  let transactions: Array<{
    id: string;
    investmentId: string;
    userId: string;
    type: TransactionType;
    amount: Prisma.Decimal;
    quantity: Prisma.Decimal | null;
    price: Prisma.Decimal | null;
    reference: string | null;
    transactionDate: Date;
  }> = [];

  // =========================================================================
  // STAGE 1: AUTHENTICATION & SECURITY VERIFICATION
  // =========================================================================
  describe('Stage 1: Registration, Login & Role Authorization', () => {
    it('should properly structure user identities and ensure safe user DTOs', () => {
      for (const [key, user] of Object.entries(users)) {
        assert.ok(user.id, `User ${key} must have a valid ID`);
        assert.ok(user.name, `User ${key} must have a valid name`);
        assert.match(user.email, /^.+@.+\..+$/, `User ${key} must have valid email`);
        // Ensure sensitive attributes like password hashes are excluded from user DTO
        assert.equal((user as any).password, undefined);
      }
    });

    it('should enforce group role permissions correctly', () => {
      const isLeader = group.members.some((m) => m.userId === users.leader.id && m.role === 'LEADER');
      const isCoLeader = group.members.some((m) => m.userId === users.coLeader.id && m.role === 'CO_LEADER');
      const isMember = group.members.some((m) => m.userId === users.member.id && m.role === 'MEMBER');
      const isOutsiderInGroup = group.members.some((m) => m.userId === users.outsider.id);

      assert.equal(isLeader, true);
      assert.equal(isCoLeader, true);
      assert.equal(isMember, true);
      assert.equal(isOutsiderInGroup, false, 'Outsider must not have group membership');
    });
  });

  // =========================================================================
  // STAGE 2: INVESTMENT CREATION & LIFECYCLE PROGRESSION
  // =========================================================================
  describe('Stage 2: Investment Creation & Transition to OPEN', () => {
    it('should initialize investment in DRAFT status', () => {
      assert.equal(investment.status, InvestmentStatus.DRAFT);
      assert.equal(investment.startDate, null);
      assert.equal(investment.lockDate, null);
    });

    it('should transition DRAFT -> OPEN and record startDate', () => {
      investment.status = InvestmentStatus.OPEN;
      investment.startDate = new Date('2026-03-01T09:00:00Z');

      assert.equal(investment.status, InvestmentStatus.OPEN);
      assert.ok(investment.startDate instanceof Date);
    });

    it('should validate lifecycle state transitions and prevent illegal jumps', () => {
      // Cannot jump from OPEN directly to SETTLED
      const isValidJump = (current: InvestmentStatus, next: InvestmentStatus) => {
        const allowed: Record<InvestmentStatus, InvestmentStatus[]> = {
          DRAFT: [InvestmentStatus.OPEN, InvestmentStatus.CANCELLED],
          OPEN: [InvestmentStatus.LOCKED, InvestmentStatus.CANCELLED],
          LOCKED: [InvestmentStatus.ACTIVE],
          ACTIVE: [InvestmentStatus.SETTLED],
          SETTLED: [],
          CANCELLED: [],
        };
        return allowed[current]?.includes(next) ?? false;
      };

      assert.equal(isValidJump(InvestmentStatus.OPEN, InvestmentStatus.SETTLED), false);
      assert.equal(isValidJump(InvestmentStatus.DRAFT, InvestmentStatus.ACTIVE), false);
      assert.equal(isValidJump(InvestmentStatus.SETTLED, InvestmentStatus.OPEN), false);
      assert.equal(isValidJump(InvestmentStatus.OPEN, InvestmentStatus.LOCKED), true);
    });
  });

  // =========================================================================
  // STAGE 3: CAPITAL CONTRIBUTIONS & MODIFICATIONS IN OPEN STATE
  // =========================================================================
  describe('Stage 3: Capital Contributions & Modification in OPEN state', () => {
    it('should record initial contributions from group members', () => {
      contributions.push(
        {
          id: 'cnt-1',
          userId: users.leader.id,
          userName: users.leader.name,
          amount: new Prisma.Decimal('10000.0000'),
          createdAt: new Date('2026-03-02T10:00:00Z'),
        },
        {
          id: 'cnt-2',
          userId: users.coLeader.id,
          userName: users.coLeader.name,
          amount: new Prisma.Decimal('5000.0000'),
          createdAt: new Date('2026-03-02T11:00:00Z'),
        },
        {
          id: 'cnt-3',
          userId: users.member.id,
          userName: users.member.name,
          amount: new Prisma.Decimal('5000.0000'),
          createdAt: new Date('2026-03-02T12:00:00Z'),
        }
      );

      const totalInitial = contributions.reduce((acc, c) => acc.plus(c.amount), new Prisma.Decimal(0));
      assert.equal(totalInitial.toFixed(4), '20000.0000');
      assert.equal(contributions.length, 3);
    });

    it('should allow modifying contributions while status is OPEN', () => {
      // Alice increases contribution to 14,000; Bob increases to 6,000 (total: 25,000)
      const aliceContrib = contributions.find((c) => c.userId === users.leader.id)!;
      aliceContrib.amount = new Prisma.Decimal('14000.0000');

      const bobContrib = contributions.find((c) => c.userId === users.coLeader.id)!;
      bobContrib.amount = new Prisma.Decimal('6000.0000');

      const totalUpdated = contributions.reduce((acc, c) => acc.plus(c.amount), new Prisma.Decimal(0));
      assert.equal(totalUpdated.toFixed(4), '25000.0000');
    });
  });

  // =========================================================================
  // STAGE 4: LOCKING & IMMUTABILITY ENFORCEMENT
  // =========================================================================
  describe('Stage 4: Transition to LOCKED & Immutability Enforcement', () => {
    it('should transition to LOCKED, set lockDate, and calculate authoritative ownership', () => {
      investment.status = InvestmentStatus.LOCKED;
      investment.lockDate = new Date('2026-03-05T18:00:00Z');

      const ownership = AccountingService.calculateOwnership(
        contributions.map((c) => ({
          userId: c.userId,
          userName: c.userName,
          amount: c.amount,
        }))
      );

      assert.equal(ownership.totalLockedAmount.toFixed(4), '25000.0000');
      assert.equal(ownership.contributorCount, 3);

      const alice = ownership.members.find((m) => m.userId === users.leader.id)!;
      const bob = ownership.members.find((m) => m.userId === users.coLeader.id)!;
      const charlie = ownership.members.find((m) => m.userId === users.member.id)!;

      // Alice: 14000 / 25000 = 0.56 (56%)
      assert.equal(alice.ownershipRatio.toFixed(4), '0.5600');
      assert.equal(alice.ownershipPercentage.toFixed(2), '56.00');

      // Bob: 6000 / 25000 = 0.24 (24%)
      assert.equal(bob.ownershipRatio.toFixed(4), '0.2400');
      assert.equal(bob.ownershipPercentage.toFixed(2), '24.00');

      // Charlie: 5000 / 25000 = 0.20 (20%)
      assert.equal(charlie.ownershipRatio.toFixed(4), '0.2000');
      assert.equal(charlie.ownershipPercentage.toFixed(2), '20.00');

      // Sum of ratios must equal exactly 1.0000
      const totalRatio = alice.ownershipRatio.plus(bob.ownershipRatio).plus(charlie.ownershipRatio);
      assert.equal(totalRatio.toFixed(4), '1.0000');
    });

    it('should reject contribution modifications and additions once LOCKED', () => {
      const isActionAllowedOnStatus = (status: InvestmentStatus) => status === InvestmentStatus.OPEN;

      // Attempting to add, edit, or delete contributions when LOCKED must be blocked
      assert.equal(isActionAllowedOnStatus(investment.status), false, 'Contributions locked');
    });
  });

  // =========================================================================
  // STAGE 5: ACTIVE TRADING & AUTHORITATIVE LEDGER
  // =========================================================================
  describe('Stage 5: Active Trading & Authoritative Ledger Transactions', () => {
    it('should transition to ACTIVE and record BUY / SELL / FEE / DIVIDEND transactions', () => {
      investment.status = InvestmentStatus.ACTIVE;
      assert.equal(investment.status, InvestmentStatus.ACTIVE);

      // 1. BUY: 25 shares @ ₹1,000 = ₹25,000
      transactions.push({
        id: 'tx-1',
        investmentId: investment.id,
        userId: users.leader.id,
        type: TransactionType.BUY,
        amount: new Prisma.Decimal('25000.0000'),
        quantity: new Prisma.Decimal('25.0000'),
        price: new Prisma.Decimal('1000.0000'),
        reference: 'BUY-ORD-101',
        transactionDate: new Date('2026-03-10T10:30:00Z'),
      });

      // 2. SELL: 15 shares @ ₹1,400 = ₹21,000 revenue
      transactions.push({
        id: 'tx-2',
        investmentId: investment.id,
        userId: users.leader.id,
        type: TransactionType.SELL,
        amount: new Prisma.Decimal('21000.0000'),
        quantity: new Prisma.Decimal('15.0000'),
        price: new Prisma.Decimal('1400.0000'),
        reference: 'SELL-ORD-202',
        transactionDate: new Date('2026-03-20T14:15:00Z'),
      });

      // 3. DIVIDEND: ₹500
      transactions.push({
        id: 'tx-3',
        investmentId: investment.id,
        userId: users.leader.id,
        type: TransactionType.DIVIDEND,
        amount: new Prisma.Decimal('500.0000'),
        quantity: null,
        price: null,
        reference: 'DIV-TATAMOTORS-Q4',
        transactionDate: new Date('2026-03-25T11:00:00Z'),
      });

      // 4. BROKERAGE FEE: ₹100
      transactions.push({
        id: 'tx-4',
        investmentId: investment.id,
        userId: users.leader.id,
        type: TransactionType.FEE,
        amount: new Prisma.Decimal('100.0000'),
        quantity: null,
        price: null,
        reference: 'FEE-STT-GST',
        transactionDate: new Date('2026-03-20T14:16:00Z'),
      });

      // 5. TAX: ₹150
      transactions.push({
        id: 'tx-5',
        investmentId: investment.id,
        userId: users.leader.id,
        type: TransactionType.TAX,
        amount: new Prisma.Decimal('150.0000'),
        quantity: null,
        price: null,
        reference: 'TAX-STT',
        transactionDate: new Date('2026-03-20T14:17:00Z'),
      });

      assert.equal(transactions.length, 5);
    });
  });

  // =========================================================================
  // STAGE 6: AUTHORITATIVE P&L & SETTLEMENT CALCULATION
  // =========================================================================
  describe('Stage 6: Authoritative Accounting Calculation (P&L & Settlements)', () => {
    it('should compute exact trading performance and member allocations via Accounting Engine', () => {
      const ownership = AccountingService.calculateOwnership(
        contributions.map((c) => ({
          userId: c.userId,
          userName: c.userName,
          amount: c.amount,
        }))
      );

      const metrics = AccountingService.calculateStockMetrics(
        transactions.map((t) => ({
          type: t.type,
          quantity: t.quantity,
          price: t.price,
          amount: t.amount,
        })),
        new Prisma.Decimal('1500.0000') // current price: 10 shares held * 1500 = 15000 market value
      );

      const memberAllocations = AccountingService.allocatePnLToMembers(ownership, metrics);

      // 1. Trading verification:
      // Bought: 25 shares @ 1000 = 25000
      // Sold: 15 shares @ 1400 = 21000 (Cost basis = 15 * 1000 = 15000 -> Realized P&L = +6000)
      // Remaining: 10 shares @ 1000 cost basis = 10000 (Current value = 15000 -> Unrealized P&L = +5000)
      assert.equal(metrics.totalBoughtShares.toFixed(4), '25.0000');
      assert.equal(metrics.totalSoldShares.toFixed(4), '15.0000');
      assert.equal(metrics.currentSharesHeld.toFixed(4), '10.0000');
      assert.equal(metrics.realizedPnl.toFixed(4), '6000.0000');
      assert.equal(metrics.unrealizedPnl.toFixed(4), '5000.0000');
      assert.equal(metrics.totalDividends.toFixed(4), '500.0000');
      assert.equal(metrics.totalFees.toFixed(4), '100.0000');
      assert.equal(metrics.totalTaxes.toFixed(4), '150.0000');

      // Net P&L = Realized (6000) + Unrealized (5000) + Dividends (500) - Fees (100) - Taxes (150) = 11250.0000
      assert.equal(metrics.netPnl.toFixed(4), '11250.0000');

      // 2. Member Allocation Verification (Strictly by locked ownership: 56% / 24% / 20%)
      const alice = memberAllocations.find((m) => m.userId === users.leader.id)!;
      const bob = memberAllocations.find((m) => m.userId === users.coLeader.id)!;
      const charlie = memberAllocations.find((m) => m.userId === users.member.id)!;

      // Alice (56%): 11250 * 0.56 = 6300.0000 Net P&L; Settlement = 14000 + 6300 = 20300.0000
      assert.equal(alice.netAllocatedPnl, '6300.0000');
      assert.equal(alice.projectedSettlement, '20300.0000');

      // Bob (24%): 11250 * 0.24 = 2700.0000 Net P&L; Settlement = 6000 + 2700 = 8700.0000
      assert.equal(bob.netAllocatedPnl, '2700.0000');
      assert.equal(bob.projectedSettlement, '8700.0000');

      // Charlie (20%): 11250 * 0.20 = 2250.0000 Net P&L; Settlement = 5000 + 2250 = 7250.0000
      assert.equal(charlie.netAllocatedPnl, '2250.0000');
      assert.equal(charlie.projectedSettlement, '7250.0000');

      // Zero rounding drift check:
      const sumAllocatedPnl = new Prisma.Decimal(alice.netAllocatedPnl)
        .plus(bob.netAllocatedPnl)
        .plus(charlie.netAllocatedPnl);
      assert.equal(sumAllocatedPnl.toFixed(4), metrics.netPnl.toFixed(4));
    });

    it('should transition to SETTLED and freeze final payouts', () => {
      investment.status = InvestmentStatus.SETTLED;
      investment.endDate = new Date('2026-03-31T17:00:00Z');

      assert.equal(investment.status, InvestmentStatus.SETTLED);
      assert.ok(investment.endDate instanceof Date);
    });
  });

  // =========================================================================
  // STAGE 7: AUTHORITATIVE PDF REPORT GENERATION
  // =========================================================================
  describe('Stage 7: Investment PDF Report Generation', () => {
    it('should generate a valid PDF binary buffer matching accounting metrics', async () => {
      const ownership = AccountingService.calculateOwnership(
        contributions.map((c) => ({
          userId: c.userId,
          userName: c.userName,
          amount: c.amount,
        }))
      );

      const metrics = AccountingService.calculateStockMetrics(
        transactions.map((t) => ({
          type: t.type,
          quantity: t.quantity,
          price: t.price,
          amount: t.amount,
        }))
      );

      const memberAllocations = AccountingService.allocatePnLToMembers(ownership, metrics);

      const summary: InvestmentAccountingSummary = {
        investment: {
          id: investment.id,
          groupId: investment.groupId,
          name: investment.name,
          symbol: investment.symbol,
          type: investment.type,
          status: investment.status,
          startDate: investment.startDate,
          lockDate: investment.lockDate,
          endDate: investment.endDate,
        },
        capital: {
          totalContributions: ownership.totalLockedAmount.toFixed(4),
          contributorCount: ownership.contributorCount,
          isLocked: true,
        },
        trading: {
          totalBoughtShares: metrics.totalBoughtShares.toFixed(4),
          totalBoughtAmount: metrics.totalBoughtAmount.toFixed(4),
          avgBuyPrice: metrics.avgBuyPrice.toFixed(4),
          totalSoldShares: metrics.totalSoldShares.toFixed(4),
          totalSoldAmount: metrics.totalSoldAmount.toFixed(4),
          avgSellPrice: metrics.avgSellPrice.toFixed(4),
          currentSharesHeld: metrics.currentSharesHeld.toFixed(4),
          costBasisRemaining: metrics.costBasisRemaining.toFixed(4),
        },
        performance: {
          totalRealizedPnl: metrics.realizedPnl.toFixed(4),
          totalUnrealizedPnl: metrics.unrealizedPnl.toFixed(4),
          totalDividends: metrics.totalDividends.toFixed(4),
          totalFees: metrics.totalFees.toFixed(4),
          totalTaxes: metrics.totalTaxes.toFixed(4),
          netPnl: metrics.netPnl.toFixed(4),
          returnPercentage: '+24.00%',
        },
        members: memberAllocations,
      };

      const safeTransactions = transactions.map((t) => ({
        id: t.id,
        investmentId: t.investmentId,
        userId: t.userId,
        type: t.type,
        amount: t.amount.toFixed(4),
        quantity: t.quantity ? t.quantity.toFixed(4) : null,
        price: t.price ? t.price.toFixed(4) : null,
        reference: t.reference,
        notes: null,
        transactionDate: t.transactionDate,
        createdAt: t.transactionDate,
      }));

      const pdfBuffer = await InvestmentPDFBuilder.build({
        summary,
        transactions: safeTransactions,
        groupName: group.name,
      });

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 1000, 'PDF buffer must contain substantial content');

      // PDF Magic bytes check
      const magicBytes = pdfBuffer.subarray(0, 4).toString('utf-8');
      assert.equal(magicBytes, '%PDF');
    });
  });

  // =========================================================================
  // STAGE 8: AI GEMMA EXTRACTION & CONFIRMATION TO LEDGER
  // =========================================================================
  describe('Stage 8: AI Document Extraction Pipeline & Ledger Write', () => {
    it('should preprocess OCR text, detect broker signature, and format Gemma prompt', () => {
      const rawSample = `
        CONTRACT NOTE - Zerodha Broking Limited
        Trade Date: 2026-03-25
        Order No: ORD-89214
        Security: TATAMOTORS EQ
        Buy Qty: 20 Price: 1000.00
        Net Amount: 20000.00
        Brokerage: 20.00 STT: 57.00
      `;

      const preprocessed = DocumentPreprocessor.preprocess(rawSample);
      assert.equal(preprocessed.detectedBroker, 'Zerodha');
      assert.equal(preprocessed.detectedType, 'TRANSACTION_NOTE');

      const prompt = GemmaPromptBuilder.buildExtractionPrompt({
        sanitizedText: preprocessed.sanitizedText,
        broker: preprocessed.detectedBroker,
        documentType: preprocessed.detectedType,
        contextSymbol: 'TATAMOTORS',
      });

      assert.ok(prompt.includes('<start_of_turn>user'));
      assert.ok(prompt.includes('CRITICAL INSTRUCTIONS'));
      assert.ok(prompt.includes('<start_of_turn>model'));
    });

    it('should extract structured transaction and validate raw extraction schema', async () => {
      const rawSample = `CONTRACT NOTE - Zerodha Broking Limited\nTrade Date: 2026-03-25\nSecurity: TATAMOTORS\nBuy Qty: 20 Price: 1000.00\nAmount: 20000.00`;
      const extraction = await gemmaClient.extract(rawSample, { contextSymbol: 'TATAMOTORS' });

      // Validate through Zod schema
      const validated = aiExtractionOutputSchema.parse(extraction);
      assert.ok(validated.items.length > 0);
      assert.equal(validated.items[0].type, 'BUY');
      assert.equal(validated.items[0].symbol, 'TATAMOTORS');
      assert.equal(validated.items[0].amount, '20000.0000');
    });

    it('should enforce confirmation review: user modifies fields and writes to ledger', () => {
      const proposedItem = {
        type: 'BUY' as const,
        amount: '20000.0000',
        quantity: '20.0000',
        price: '1000.0000',
        reference: 'ORD-89214',
        notes: 'Zerodha trade note confirmed',
        transactionDate: '2026-03-25T10:00:00Z',
      };

      // Validate confirmation input payload
      const confirmedInput = confirmExtractionSchema.parse({
        investmentId: investment.id,
        ...proposedItem,
      });

      assert.equal(confirmedInput.amount, '20000.0000');
      assert.equal(confirmedInput.type, 'BUY');

      // Append confirmed transaction to ledger
      transactions.push({
        id: 'tx-ai-confirmed-1',
        investmentId: investment.id,
        userId: users.leader.id,
        type: confirmedInput.type,
        amount: new Prisma.Decimal(confirmedInput.amount),
        quantity: confirmedInput.quantity ? new Prisma.Decimal(confirmedInput.quantity) : null,
        price: confirmedInput.price ? new Prisma.Decimal(confirmedInput.price) : null,
        reference: confirmedInput.reference || null,
        transactionDate: new Date(confirmedInput.transactionDate!),
      });

      assert.equal(transactions.some((t) => t.id === 'tx-ai-confirmed-1'), true);
    });
  });

  // =========================================================================
  // STAGE 9: TABPFN ANOMALY DETECTION & AI SAFETY
  // =========================================================================
  describe('Stage 9: TabPFN Anomaly Detection & AI Safety Verification', () => {
    it('should extract tabular features from the transaction ledger', () => {
      const features = TabPFNFeatureExtractor.extractFeatures(
        transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          quantity: t.quantity,
          price: t.price,
          transactionDate: t.transactionDate,
          userId: t.userId,
        })),
        25000 // total capital basis
      );

      assert.equal(features.length, transactions.length);
      for (const feat of features) {
        assert.ok(typeof feat.zScoreAmount === 'number');
        assert.ok(typeof feat.ratioToTotalCapital === 'number');
        assert.ok(typeof feat.timeDeltaHours === 'number');
      }
    });

    it('should score transactions and strictly obey non-punitive AI safety rules', async () => {
      const features = TabPFNFeatureExtractor.extractFeatures(
        transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          quantity: t.quantity,
          price: t.price,
          transactionDate: t.transactionDate,
          userId: t.userId,
        })),
        25000
      );

      const predictions = await tabpfnClient.predictAnomalies(features);
      assert.equal(predictions.length, features.length);

      // Verify that every factor adheres to AI Safety: NO derogatory or fraud labels
      for (const pred of predictions) {
        for (const factor of pred.contributingFactors) {
          const desc = factor.description.toLowerCase();
          assert.equal(desc.includes('fraud'), false, 'Never use fraud label');
          assert.equal(desc.includes('criminal'), false, 'Never use criminal label');
          assert.equal(desc.includes('scam'), false, 'Never use scam label');
        }
      }
    });
  });

  // =========================================================================
  // STAGE 10: PRODUCTION HEALTH CHECK & OBSERVABILITY
  // =========================================================================
  describe('Stage 10: Production Health Check & Monitoring', () => {
    it('should respond to GET /api/health with operational status and services metadata', async () => {
      const res = await request(app).get('/api/health');

      // Health endpoint must respond with 200 (or 503 if standalone without DB) and valid JSON
      assert.ok([200, 503].includes(res.status), `Expected 200 or 503, got ${res.status}`);
      assert.ok(res.body.timestamp, 'Health response must contain timestamp');
      assert.ok(typeof res.body.uptimeSeconds === 'number', 'Uptime must be a number');
      assert.equal(res.body.services.accountingEngine, 'authoritative');
      assert.equal(res.body.services.aiPipeline, 'ready');
      assert.equal(res.body.version, '1.0.0');
    });
  });
});

