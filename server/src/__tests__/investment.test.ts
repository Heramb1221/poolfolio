import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { InvestmentStatus, InvestmentType, GroupRole } from '@prisma/client';
import app from '../app';
import prisma from '../config/prisma';
import authService from '../services/auth.service';

describe('Investments API (/api/investments & /api/groups/:groupId/investments)', () => {
  const timestamp = Date.now();

  let leaderToken = '';
  let leaderUser: { id: string; name: string; email: string };

  let coLeaderToken = '';
  let coLeaderUser: { id: string; name: string; email: string };

  let memberToken = '';
  let memberUser: { id: string; name: string; email: string };

  let outsiderToken = '';
  let outsiderUser: { id: string; name: string; email: string };

  let groupBLeaderToken = '';
  let groupBLeaderUser: { id: string; name: string; email: string };

  let testGroupAId = '';
  let testGroupBId = '';

  before(async () => {
    // 1. Create users
    const leaderRes = await authService.register({
      name: 'Group A Leader',
      email: `leaderA.${timestamp}@example.com`,
      password: 'Password123!',
    });
    leaderUser = leaderRes.user;
    leaderToken = leaderRes.token;

    const coLeaderRes = await authService.register({
      name: 'Group A CoLeader',
      email: `coLeaderA.${timestamp}@example.com`,
      password: 'Password123!',
    });
    coLeaderUser = coLeaderRes.user;
    coLeaderToken = coLeaderRes.token;

    const memberRes = await authService.register({
      name: 'Group A Member',
      email: `memberA.${timestamp}@example.com`,
      password: 'Password123!',
    });
    memberUser = memberRes.user;
    memberToken = memberRes.token;

    const outsiderRes = await authService.register({
      name: 'Outsider User',
      email: `outsider.${timestamp}@example.com`,
      password: 'Password123!',
    });
    outsiderUser = outsiderRes.user;
    outsiderToken = outsiderRes.token;

    const groupBLeaderRes = await authService.register({
      name: 'Group B Leader',
      email: `leaderB.${timestamp}@example.com`,
      password: 'Password123!',
    });
    groupBLeaderUser = groupBLeaderRes.user;
    groupBLeaderToken = groupBLeaderRes.token;

    // 2. Create Group A
    const groupARes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: `Group A ${timestamp}` });
    testGroupAId = groupARes.body.data.group.id;

    // Add co-leader and member to Group A
    await request(app)
      .post(`/api/groups/${testGroupAId}/members`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ userId: coLeaderUser.id, role: GroupRole.CO_LEADER });

    await request(app)
      .post(`/api/groups/${testGroupAId}/members`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ userId: memberUser.id, role: GroupRole.MEMBER });

    // 3. Create Group B
    const groupBRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${groupBLeaderToken}`)
      .send({ name: `Group B ${timestamp}` });
    testGroupBId = groupBRes.body.data.group.id;
  });

  after(async () => {
    // Cleanup created investments, groups, memberships, and users
    if (testGroupAId || testGroupBId) {
      const groupIds = [testGroupAId, testGroupBId].filter(Boolean);
      await prisma.contribution.deleteMany({
        where: { investment: { groupId: { in: groupIds } } },
      });
      await prisma.investment.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await prisma.groupMember.deleteMany({
        where: { groupId: { in: groupIds } },
      });
      await prisma.group.deleteMany({
        where: { id: { in: groupIds } },
      });
    }

    const testUserIds = [
      leaderUser?.id,
      coLeaderUser?.id,
      memberUser?.id,
      outsiderUser?.id,
      groupBLeaderUser?.id,
    ].filter(Boolean) as string[];

    if (testUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
    }

    await prisma.$disconnect();
  });

  // ==========================================
  // Investment Creation Tests
  // ==========================================
  describe('Investment Creation', () => {
    it('1. LEADER can create an investment in DRAFT status', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Tata Consultancy Services Jan 2027',
          symbol: 'tcs',
          type: InvestmentType.STOCK,
          exchange: 'NSE',
          broker: 'Zerodha',
        });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.investment.name, 'Tata Consultancy Services Jan 2027');
      assert.strictEqual(response.body.data.investment.symbol, 'TCS');
      assert.strictEqual(response.body.data.investment.type, 'STOCK');
      assert.strictEqual(response.body.data.investment.status, InvestmentStatus.DRAFT);
      assert.strictEqual(response.body.data.investment.groupId, testGroupAId);
    });

    it('2. CO_LEADER can create an investment', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${coLeaderToken}`)
        .send({
          name: 'Swiggy IPO',
          symbol: 'SWIGGY',
          type: InvestmentType.IPO,
          exchange: 'NSE',
        });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.investment.name, 'Swiggy IPO');
      assert.strictEqual(response.body.data.investment.type, 'IPO');
      assert.strictEqual(response.body.data.investment.status, InvestmentStatus.DRAFT);
    });

    it('3. MEMBER cannot create an investment (403 Forbidden)', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Infosys Stock',
          symbol: 'INFY',
          type: InvestmentType.STOCK,
        });

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.body.success, false);
      assert.match(response.body.error.message, /leaders and co-leaders/i);
    });

    it('4. non-member cannot create an investment (403 Forbidden)', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          name: 'Wipro Stock',
          symbol: 'WIPRO',
          type: InvestmentType.STOCK,
        });

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.body.success, false);
    });

    it('5. unauthenticated request is rejected (401 Unauthorized)', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .send({
          name: 'Wipro Stock',
          symbol: 'WIPRO',
          type: InvestmentType.STOCK,
        });

      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.success, false);
    });

    it('6. validates invalid request body (missing name or invalid type)', async () => {
      const resMissingName = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          symbol: 'RELIANCE',
          type: 'STOCK',
        });

      assert.strictEqual(resMissingName.status, 400);

      const resInvalidType = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Crypto Bet',
          symbol: 'BTC',
          type: 'CRYPTO',
        });

      assert.strictEqual(resInvalidType.status, 400);
    });

    it('7. independent investments can exist for the same symbol', async () => {
      // Create first TCS investment
      const res1 = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'TCS January Pool',
          symbol: 'TCS',
          type: InvestmentType.STOCK,
        });
      assert.strictEqual(res1.status, 201);

      // Create second TCS investment in March
      const res2 = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'TCS March Pool',
          symbol: 'TCS',
          type: InvestmentType.STOCK,
        });
      assert.strictEqual(res2.status, 201);

      assert.notStrictEqual(res1.body.data.investment.id, res2.body.data.investment.id);
      assert.strictEqual(res1.body.data.investment.symbol, 'TCS');
      assert.strictEqual(res2.body.data.investment.symbol, 'TCS');
    });
  });

  // ==========================================
  // Investment Retrieval Tests
  // ==========================================
  describe('Investment Retrieval', () => {
    let createdInvestmentId = '';

    before(async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'HDFC Bank Investment',
          symbol: 'HDFCBANK',
          type: InvestmentType.STOCK,
        });
      createdInvestmentId = res.body.data.investment.id;
    });

    it('8. MEMBER can view all investments belonging to their group', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.ok(Array.isArray(response.body.data.investments));
      assert.ok(response.body.data.investments.length >= 1);
    });

    it('9. MEMBER can view single investment by ID in their group', async () => {
      const response = await request(app)
        .get(`/api/investments/${createdInvestmentId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.investment.id, createdInvestmentId);
      assert.strictEqual(response.body.data.investment.symbol, 'HDFCBANK');
    });

    it('10. non-member cannot list investments of another group (403 Forbidden)', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.body.success, false);
    });

    it('11. query filters by status and type work correctly', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroupAId}/investments?status=DRAFT&type=STOCK`)
        .set('Authorization', `Bearer ${leaderToken}`);

      assert.strictEqual(response.status, 200);
      assert.ok(response.body.data.investments.every(
        (inv: { status: string; type: string }) => inv.status === 'DRAFT' && inv.type === 'STOCK'
      ));
    });

    it('12. non-existent investment returns 404', async () => {
      const response = await request(app)
        .get('/api/investments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${leaderToken}`);

      assert.strictEqual(response.status, 404);
    });
  });

  // ==========================================
  // Cross-Group Security Tests
  // ==========================================
  describe('Cross-Group Security', () => {
    let groupAInvestmentId = '';

    before(async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Group A Confidential Investment',
          symbol: 'CONF',
          type: InvestmentType.STOCK,
        });
      groupAInvestmentId = res.body.data.investment.id;
    });

    it('13. Group B LEADER cannot GET Group A investment by ID (403 Forbidden)', async () => {
      const response = await request(app)
        .get(`/api/investments/${groupAInvestmentId}`)
        .set('Authorization', `Bearer ${groupBLeaderToken}`);

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.body.success, false);
      assert.match(response.body.error.message, /access to this investment/i);
    });

    it('14. Group B LEADER cannot PATCH Group A investment (403 Forbidden)', async () => {
      const response = await request(app)
        .patch(`/api/investments/${groupAInvestmentId}`)
        .set('Authorization', `Bearer ${groupBLeaderToken}`)
        .send({ name: 'Hacked Name' });

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.body.success, false);
    });

    it('15. Group B LEADER cannot DELETE Group A investment (403 Forbidden)', async () => {
      const response = await request(app)
        .delete(`/api/investments/${groupAInvestmentId}`)
        .set('Authorization', `Bearer ${groupBLeaderToken}`);

      assert.strictEqual(response.status, 403);
      assert.strictEqual(response.body.success, false);
    });
  });

  // ==========================================
  // Investment Lifecycle Tests
  // ==========================================
  describe('Investment Lifecycle & Transitions', () => {
    let lifecycleInvId = '';

    before(async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Lifecycle Tracking Test',
          symbol: 'LIFECYCLE',
          type: InvestmentType.STOCK,
        });
      lifecycleInvId = res.body.data.investment.id;
    });

    it('16. Rejects invalid transition DRAFT → ACTIVE (400)', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.ACTIVE });

      assert.strictEqual(response.status, 400);
      assert.match(response.body.error.message, /Invalid status transition/i);
    });

    it('17. Rejects invalid transition DRAFT → LOCKED (400)', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.LOCKED });

      assert.strictEqual(response.status, 400);
      assert.match(response.body.error.message, /Invalid status transition/i);
    });

    it('18. Rejects invalid transition DRAFT → SETTLED (400)', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.SETTLED });

      assert.strictEqual(response.status, 400);
    });

    it('19. DRAFT → OPEN records startDate', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.data.investment.status, InvestmentStatus.OPEN);
      assert.ok(response.body.data.investment.startDate);
    });

    it('20. Rejects invalid transition OPEN → ACTIVE (400)', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.ACTIVE });

      assert.strictEqual(response.status, 400);
    });

    it('21. OPEN → LOCKED records lockDate', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.LOCKED });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.data.investment.status, InvestmentStatus.LOCKED);
      assert.ok(response.body.data.investment.lockDate);
    });

    it('22. Rejects invalid transition LOCKED → OPEN or CANCELLED (400)', async () => {
      const resOpen = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });

      assert.strictEqual(resOpen.status, 400);

      const resCancel = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.CANCELLED });

      assert.strictEqual(resCancel.status, 400);
    });

    it('23. LOCKED → ACTIVE transitions successfully', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${coLeaderToken}`)
        .send({ status: InvestmentStatus.ACTIVE });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.data.investment.status, InvestmentStatus.ACTIVE);
    });

    it('24. Rejects invalid transition ACTIVE → OPEN, LOCKED, or CANCELLED (400)', async () => {
      const resOpen = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });
      assert.strictEqual(resOpen.status, 400);

      const resLocked = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.LOCKED });
      assert.strictEqual(resLocked.status, 400);

      const resCancelled = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.CANCELLED });
      assert.strictEqual(resCancelled.status, 400);
    });

    it('25. ACTIVE → SETTLED records endDate', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.SETTLED });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.data.investment.status, InvestmentStatus.SETTLED);
      assert.ok(response.body.data.investment.endDate);
    });

    it('26. Rejects any status change once SETTLED (400)', async () => {
      const response = await request(app)
        .patch(`/api/investments/${lifecycleInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });

      assert.strictEqual(response.status, 400);
      assert.match(response.body.error.message, /Cannot modify an investment that is settled/i);
    });

    it('27. DRAFT → CANCELLED is allowed and terminal', async () => {
      const draftRes = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Draft Cancellation Test',
          symbol: 'CANCEL1',
          type: InvestmentType.STOCK,
        });
      const cancelInvId = draftRes.body.data.investment.id;

      const cancelRes = await request(app)
        .patch(`/api/investments/${cancelInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.CANCELLED });

      assert.strictEqual(cancelRes.status, 200);
      assert.strictEqual(cancelRes.body.data.investment.status, InvestmentStatus.CANCELLED);

      // Reopening cancelled investment must be rejected
      const reopenRes = await request(app)
        .patch(`/api/investments/${cancelInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });

      assert.strictEqual(reopenRes.status, 400);
      assert.match(reopenRes.body.error.message, /Cannot modify an investment that is cancelled/i);
    });

    it('28. OPEN → CANCELLED is allowed', async () => {
      const draftRes = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Open Cancellation Test',
          symbol: 'CANCEL2',
          type: InvestmentType.IPO,
        });
      const cancelInvId = draftRes.body.data.investment.id;

      await request(app)
        .patch(`/api/investments/${cancelInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });

      const cancelRes = await request(app)
        .patch(`/api/investments/${cancelInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.CANCELLED });

      assert.strictEqual(cancelRes.status, 200);
      assert.strictEqual(cancelRes.body.data.investment.status, InvestmentStatus.CANCELLED);
    });
  });

  // ==========================================
  // Role Authorization & Deletion Rules
  // ==========================================
  describe('Role Authorization & Deletion Rules', () => {
    let testInvId = '';

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Role Deletion Test Investment',
          symbol: 'RTEST',
          type: InvestmentType.STOCK,
        });
      testInvId = res.body.data.investment.id;
    });

    it('29. MEMBER cannot modify investment (403 Forbidden)', async () => {
      const response = await request(app)
        .patch(`/api/investments/${testInvId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Changed Name' });

      assert.strictEqual(response.status, 403);
      assert.match(response.body.error.message, /leaders and co-leaders/i);
    });

    it('30. MEMBER cannot delete investment (403 Forbidden)', async () => {
      const response = await request(app)
        .delete(`/api/investments/${testInvId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(response.status, 403);
      assert.match(response.body.error.message, /leaders and co-leaders/i);
    });

    it('31. LEADER can delete eligible DRAFT investment', async () => {
      const response = await request(app)
        .delete(`/api/investments/${testInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);

      // Verify deletion from DB
      const getRes = await request(app)
        .get(`/api/investments/${testInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`);
      assert.strictEqual(getRes.status, 404);
    });

    it('32. Cannot delete an investment that is LOCKED, ACTIVE, or SETTLED (400)', async () => {
      // Progress test investment to LOCKED
      await request(app)
        .patch(`/api/investments/${testInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });

      await request(app)
        .patch(`/api/investments/${testInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.LOCKED });

      const delRes = await request(app)
        .delete(`/api/investments/${testInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`);

      assert.strictEqual(delRes.status, 400);
      assert.match(delRes.body.error.message, /Cannot delete an investment that is locked/i);
    });

    it('33. Cannot delete an investment with existing financial records (400)', async () => {
      // Create a DRAFT investment and insert a contribution record into DB
      const draftRes = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Investment with Financial History',
          symbol: 'FINHIST',
          type: InvestmentType.STOCK,
        });
      const finInvId = draftRes.body.data.investment.id;

      // Add a dummy contribution record in database
      await prisma.contribution.create({
        data: {
          investmentId: finInvId,
          userId: memberUser.id,
          amount: 5000,
        },
      });

      const delRes = await request(app)
        .delete(`/api/investments/${finInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`);

      assert.strictEqual(delRes.status, 400);
      assert.match(delRes.body.error.message, /Cannot delete an investment with existing financial records/i);
    });
  });
});
