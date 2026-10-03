import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { InvestmentStatus, InvestmentType, GroupRole, TransactionType } from '@prisma/client';
import app from '../app';
import prisma from '../config/prisma';
import authService from '../services/auth.service';

describe('Transactions & Accounting APIs', () => {
  const timestamp = Date.now();

  let leaderToken = '';
  let leaderUser: { id: string; name: string; email: string };

  let coLeaderToken = '';
  let coLeaderUser: { id: string; name: string; email: string };

  let memberToken = '';
  let memberUser: { id: string; name: string; email: string };

  let outsiderToken = '';
  let outsiderUser: { id: string; name: string; email: string };

  let testGroupId = '';
  let draftInvId = '';
  let openInvId = '';
  let lockedInvId = '';
  let activeInvId = '';
  let createdTransactionId = '';

  before(async () => {
    // 1. Create users
    const leaderRes = await authService.register({
      name: 'Tx Leader',
      email: `tx.leader.${timestamp}@example.com`,
      password: 'Password123!',
    });
    leaderUser = leaderRes.user;
    leaderToken = leaderRes.token;

    const coLeaderRes = await authService.register({
      name: 'Tx CoLeader',
      email: `tx.coleader.${timestamp}@example.com`,
      password: 'Password123!',
    });
    coLeaderUser = coLeaderRes.user;
    coLeaderToken = coLeaderRes.token;

    const memberRes = await authService.register({
      name: 'Tx Member',
      email: `tx.member.${timestamp}@example.com`,
      password: 'Password123!',
    });
    memberUser = memberRes.user;
    memberToken = memberRes.token;

    const outsiderRes = await authService.register({
      name: 'Tx Outsider',
      email: `tx.outsider.${timestamp}@example.com`,
      password: 'Password123!',
    });
    outsiderUser = outsiderRes.user;
    outsiderToken = outsiderRes.token;

    // 2. Create Group
    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: `Tx Group ${timestamp}` });
    testGroupId = groupRes.body.data.group.id;

    // Add coLeader and member to group
    await request(app)
      .post(`/api/groups/${testGroupId}/members`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ userId: coLeaderUser.id, role: GroupRole.CO_LEADER });

    await request(app)
      .post(`/api/groups/${testGroupId}/members`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ userId: memberUser.id, role: GroupRole.MEMBER });

    // 3. Create Investments in various lifecycle statuses
    // DRAFT
    const draftRes = await request(app)
      .post(`/api/groups/${testGroupId}/investments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Draft Corp',
        symbol: `DFT${timestamp.toString().slice(-4)}`,
        type: InvestmentType.STOCK,
      });
    draftInvId = draftRes.body.data.investment.id;

    // OPEN
    const openRes = await request(app)
      .post(`/api/groups/${testGroupId}/investments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Open Corp',
        symbol: `OPN${timestamp.toString().slice(-4)}`,
        type: InvestmentType.STOCK,
      });
    openInvId = openRes.body.data.investment.id;
    await request(app)
      .patch(`/api/investments/${openInvId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: InvestmentStatus.OPEN });

    // LOCKED
    const lockedRes = await request(app)
      .post(`/api/groups/${testGroupId}/investments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Locked Corp',
        symbol: `LCK${timestamp.toString().slice(-4)}`,
        type: InvestmentType.STOCK,
      });
    lockedInvId = lockedRes.body.data.investment.id;
    await request(app)
      .patch(`/api/investments/${lockedInvId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: InvestmentStatus.OPEN });
    await request(app)
      .patch(`/api/investments/${lockedInvId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: InvestmentStatus.LOCKED });

    // ACTIVE with contributions for accounting
    const activeRes = await request(app)
      .post(`/api/groups/${testGroupId}/investments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Active Corp',
        symbol: `ACT${timestamp.toString().slice(-4)}`,
        type: InvestmentType.STOCK,
      });
    activeInvId = activeRes.body.data.investment.id;

    // Transition to OPEN -> contribute -> LOCKED -> ACTIVE
    await request(app)
      .patch(`/api/investments/${activeInvId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: InvestmentStatus.OPEN });

    // Leader contributes 6000 (60%), Member contributes 4000 (40%)
    await request(app)
      .post(`/api/investments/${activeInvId}/contributions`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ amount: '6000.0000', notes: 'Leader initial' });

    await request(app)
      .post(`/api/investments/${activeInvId}/contributions`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ amount: '4000.0000', notes: 'Member initial' });

    // Lock and activate
    await request(app)
      .patch(`/api/investments/${activeInvId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: InvestmentStatus.LOCKED });

    await request(app)
      .patch(`/api/investments/${activeInvId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: InvestmentStatus.ACTIVE });
  });

  after(async () => {
    // Clean up test data
    try {
      await prisma.settlement.deleteMany({
        where: { investment: { groupId: testGroupId } },
      });
      await prisma.transaction.deleteMany({
        where: { investment: { groupId: testGroupId } },
      });
      await prisma.contribution.deleteMany({
        where: { investment: { groupId: testGroupId } },
      });
      await prisma.investment.deleteMany({
        where: { groupId: testGroupId },
      });
      await prisma.groupMember.deleteMany({
        where: { groupId: testGroupId },
      });
      await prisma.group.deleteMany({
        where: { id: testGroupId },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [leaderUser.id, coLeaderUser.id, memberUser.id, outsiderUser.id],
          },
        },
      });
    } catch {
      // Ignore cleanup error in case DB disconnected
    }
  });

  describe('1. Transaction Creation & Authorization', () => {
    it('should allow LEADER to record a BUY transaction on an ACTIVE investment (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          type: TransactionType.BUY,
          amount: '10000.0000',
          quantity: '100.0000',
          price: '100.0000',
          reference: 'ORD-BUY-101',
          notes: 'Executed 100 shares via Zerodha',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.transaction.type, TransactionType.BUY);
      assert.equal(res.body.data.transaction.amount, '10000.0000');
      assert.equal(res.body.data.transaction.quantity, '100.0000');
      assert.equal(res.body.data.transaction.price, '100.0000');
      assert.equal(res.body.data.transaction.reference, 'ORD-BUY-101');

      createdTransactionId = res.body.data.transaction.id;
    });

    it('should allow CO_LEADER to record transaction events (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${coLeaderToken}`)
        .send({
          type: TransactionType.DIVIDEND,
          amount: '500.0000',
          notes: 'Interim dividend payout',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.transaction.type, TransactionType.DIVIDEND);
      assert.equal(res.body.data.transaction.amount, '500.0000');
    });

    it('should reject MEMBER attempting to record a transaction (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          type: TransactionType.BUY,
          amount: '1000.0000',
        });

      assert.equal(res.status, 403);
    });

    it('should reject non-member / outsider recording a transaction (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          type: TransactionType.BUY,
          amount: '1000.0000',
        });

      assert.equal(res.status, 403);
    });

    it('should reject recording a transaction on DRAFT investment (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/investments/${draftInvId}/transactions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          type: TransactionType.BUY,
          amount: '1000.0000',
        });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /Cannot record transactions/i);
    });

    it('should reject transaction with zero or negative amount (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          type: TransactionType.BUY,
          amount: '0.0000',
        });

      assert.equal(res.status, 400);
    });

    it('should reject transaction referencing a userId outside the group (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          type: TransactionType.REFUND,
          amount: '100.0000',
          userId: outsiderUser.id,
        });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /not a member of this investment group/i);
    });
  });

  describe('2. Transaction Retrieval & Filtering', () => {
    it('should allow any group member to list transactions with summary totals', async () => {
      const res = await request(app)
        .get(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.ok(res.body.data.transactions.length >= 2);
      assert.ok(res.body.data.typeTotals[TransactionType.BUY]);
      assert.ok(res.body.data.typeTotals[TransactionType.DIVIDEND]);
    });

    it('should filter transactions by type', async () => {
      const res = await request(app)
        .get(`/api/investments/${activeInvId}/transactions?type=${TransactionType.BUY}`)
        .set('Authorization', `Bearer ${leaderToken}`);

      assert.equal(res.status, 200);
      for (const t of res.body.data.transactions) {
        assert.equal(t.type, TransactionType.BUY);
      }
    });

    it('should get transaction details by ID for group members', async () => {
      const res = await request(app)
        .get(`/api/investments/${activeInvId}/transactions/${createdTransactionId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.transaction.id, createdTransactionId);
      assert.equal(res.body.data.transaction.reference, 'ORD-BUY-101');
    });

    it('should reject outsider viewing transactions (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      assert.equal(res.status, 403);
    });
  });

  describe('3. Transaction Update Rules', () => {
    it('should allow LEADER to update reference or notes (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/investments/${activeInvId}/transactions/${createdTransactionId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          reference: 'ORD-BUY-101-CONFIRMED',
          notes: 'Zerodha trade confirmed by broker statement',
        });

      assert.equal(res.status, 200);
      assert.equal(
        res.body.data.transaction.reference,
        'ORD-BUY-101-CONFIRMED'
      );
      assert.equal(
        res.body.data.transaction.notes,
        'Zerodha trade confirmed by broker statement'
      );
    });

    it('should reject MEMBER attempting to update transaction (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/investments/${activeInvId}/transactions/${createdTransactionId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ notes: 'Member edit' });

      assert.equal(res.status, 403);
    });
  });

  describe('4. Authoritative Accounting Endpoints', () => {
    it('GET /api/investments/:investmentId/ownership should return exact locked ownership percentages', async () => {
      const res = await request(app)
        .get(`/api/investments/${activeInvId}/ownership`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.isLocked, true);
      assert.equal(res.body.data.totalLockedCapital, '10000.0000');
      assert.equal(res.body.data.contributorCount, 2);

      const leader = res.body.data.members.find((m: any) => m.userId === leaderUser.id);
      const member = res.body.data.members.find((m: any) => m.userId === memberUser.id);

      assert.equal(leader.lockedContribution, '6000.0000');
      assert.equal(leader.ownershipPercentage, '60.0000%');
      assert.equal(member.lockedContribution, '4000.0000');
      assert.equal(member.ownershipPercentage, '40.0000%');
    });

    it('GET /api/investments/:investmentId/pnl should return authoritative backend calculation', async () => {
      // Record a SELL transaction of 100 shares @ 140 = 14000 (+4000 profit on 10000 cost basis)
      // and FEE of 50. Plus existing DIVIDEND of 500.
      // Net P&L = 4000 + 500 - 50 = 4450.
      await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          type: TransactionType.SELL,
          amount: '14000.0000',
          quantity: '100.0000',
          price: '140.0000',
        });

      await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          type: TransactionType.FEE,
          amount: '50.0000',
        });

      const res = await request(app)
        .get(`/api/investments/${activeInvId}/pnl`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.totalRealizedPnl, '4000.0000');
      assert.equal(res.body.data.totalDividends, '500.0000');
      assert.equal(res.body.data.totalFees, '50.0000');
      assert.equal(res.body.data.netPnl, '4450.0000');

      const leaderAlloc = res.body.data.members.find((m: any) => m.userId === leaderUser.id);
      const memberAlloc = res.body.data.members.find((m: any) => m.userId === memberUser.id);

      // 60% of 4450 = 2670
      assert.equal(leaderAlloc.netAllocatedPnl, '2670.0000');
      // Leader settlement = 6000 + 2670 = 8670
      assert.equal(leaderAlloc.projectedSettlement, '8670.0000');

      // 40% of 4450 = 1780
      assert.equal(memberAlloc.netAllocatedPnl, '1780.0000');
      // Member settlement = 4000 + 1780 = 5780
      assert.equal(memberAlloc.projectedSettlement, '5780.0000');
    });

    it('GET /api/investments/:investmentId/settlements should return projected settlements', async () => {
      const res = await request(app)
        .get(`/api/investments/${activeInvId}/settlements`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.isSettled, false);
      assert.equal(res.body.data.totalProfitLoss, '4450.0000');
      assert.equal(res.body.data.totalFinalPayout, '14450.0000');
    });

    it('POST /api/investments/:investmentId/settle should settle investment and persist settlements', async () => {
      // Settle investment as LEADER
      const settleRes = await request(app)
        .post(`/api/investments/${activeInvId}/settle`)
        .set('Authorization', `Bearer ${leaderToken}`);

      assert.equal(settleRes.status, 200);
      assert.equal(settleRes.body.data.isSettled, true);
      assert.equal(settleRes.body.data.totalFinalPayout, '14450.0000');

      // Verify investment is now SETTLED
      const invRes = await request(app)
        .get(`/api/investments/${activeInvId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      assert.equal(invRes.body.data.investment.status, InvestmentStatus.SETTLED);

      // Verify subsequent transaction cannot be added to SETTLED investment
      const postSettleTx = await request(app)
        .post(`/api/investments/${activeInvId}/transactions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          type: TransactionType.BUY,
          amount: '1000.0000',
        });
      assert.equal(postSettleTx.status, 400);
      assert.match(postSettleTx.body.message, /already settled/i);
    });

    it('GET /api/investments/:investmentId/summary should return unified accounting and trading summary', async () => {
      const res = await request(app)
        .get(`/api/investments/${activeInvId}/summary`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'success');
      assert.equal(res.body.data.investment.id, activeInvId);
      assert.equal(res.body.data.capital.totalContributions, '10000.0000');
      assert.equal(res.body.data.trading.totalBoughtAmount, '10000.0000');
      assert.equal(res.body.data.trading.totalSoldAmount, '14000.0000');
      assert.equal(res.body.data.performance.totalRealizedPnl, '4000.0000');
      assert.equal(res.body.data.performance.netPnl, '4450.0000');
      assert.equal(res.body.data.members.length, 2);
    });
  });
});
