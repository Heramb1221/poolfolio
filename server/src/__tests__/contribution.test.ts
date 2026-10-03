import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { InvestmentStatus, InvestmentType, GroupRole } from '@prisma/client';
import app from '../app';
import prisma from '../config/prisma';
import authService from '../services/auth.service';

describe('Contributions API (/api/investments/:investmentId/contributions)', () => {
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

  let draftInvId = '';
  let openInvId = '';
  let lockedInvId = '';

  before(async () => {
    // 1. Create users
    const leaderRes = await authService.register({
      name: 'Leader User',
      email: `contrib.leader.${timestamp}@example.com`,
      password: 'Password123!',
    });
    leaderUser = leaderRes.user;
    leaderToken = leaderRes.token;

    const coLeaderRes = await authService.register({
      name: 'CoLeader User',
      email: `contrib.coleader.${timestamp}@example.com`,
      password: 'Password123!',
    });
    coLeaderUser = coLeaderRes.user;
    coLeaderToken = coLeaderRes.token;

    const memberRes = await authService.register({
      name: 'Member User',
      email: `contrib.member.${timestamp}@example.com`,
      password: 'Password123!',
    });
    memberUser = memberRes.user;
    memberToken = memberRes.token;

    const outsiderRes = await authService.register({
      name: 'Outsider User',
      email: `contrib.outsider.${timestamp}@example.com`,
      password: 'Password123!',
    });
    outsiderUser = outsiderRes.user;
    outsiderToken = outsiderRes.token;

    const groupBLeaderRes = await authService.register({
      name: 'Group B Leader',
      email: `contrib.groupB.${timestamp}@example.com`,
      password: 'Password123!',
    });
    groupBLeaderUser = groupBLeaderRes.user;
    groupBLeaderToken = groupBLeaderRes.token;

    // 2. Create Group A
    const groupARes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: `Contribution Group A ${timestamp}` });
    testGroupAId = groupARes.body.data.group.id;

    // Add coLeader and member to Group A
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
      .send({ name: `Contribution Group B ${timestamp}` });
    testGroupBId = groupBRes.body.data.group.id;

    // 4. Create test investments in Group A
    // DRAFT Investment
    const draftRes = await request(app)
      .post(`/api/groups/${testGroupAId}/investments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Draft Investment',
        symbol: 'DRAFTINV',
        type: InvestmentType.STOCK,
      });
    draftInvId = draftRes.body.data.investment.id;

    // OPEN Investment
    const openRes = await request(app)
      .post(`/api/groups/${testGroupAId}/investments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Open Investment for Contributions',
        symbol: 'OPENINV',
        type: InvestmentType.STOCK,
      });
    openInvId = openRes.body.data.investment.id;
    await request(app)
      .patch(`/api/investments/${openInvId}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: InvestmentStatus.OPEN });

    // LOCKED Investment
    const lockedRes = await request(app)
      .post(`/api/groups/${testGroupAId}/investments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        name: 'Locked Investment',
        symbol: 'LOCKINV',
        type: InvestmentType.IPO,
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
  });

  after(async () => {
    // Cleanup
    const groupIds = [testGroupAId, testGroupBId].filter(Boolean);
    if (groupIds.length > 0) {
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
  // Contribution Creation Tests
  // ==========================================
  describe('Contribution Creation', () => {
    it('1. Rejects contribution when investment is in DRAFT status (400)', async () => {
      const response = await request(app)
        .post(`/api/investments/${draftInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 5000 });

      assert.strictEqual(response.status, 400);
      assert.match(response.body.error.message, /OPEN status/i);
    });

    it('2. Member can create contribution for themselves when investment is OPEN', async () => {
      const response = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          amount: 5000,
          notes: 'My initial commitment',
        });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.data.contribution.userId, memberUser.id);
      assert.strictEqual(response.body.data.contribution.amount, '5000.0000');
      assert.strictEqual(response.body.data.contribution.notes, 'My initial commitment');
    });

    it('3. Member can add multiple contributions while investment is OPEN', async () => {
      const response = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 2500.5 });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.data.contribution.amount, '2500.5000');
    });

    it('4. Leader can record a contribution on behalf of another group member', async () => {
      const response = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          userId: memberUser.id,
          amount: 10000,
          notes: 'Recorded via broker cheque',
        });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.data.contribution.userId, memberUser.id);
      assert.strictEqual(response.body.data.contribution.amount, '10000.0000');
    });

    it('5. Co-Leader can record a contribution on behalf of another group member', async () => {
      const response = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${coLeaderToken}`)
        .send({
          userId: leaderUser.id,
          amount: 15000,
        });

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.body.data.contribution.userId, leaderUser.id);
      assert.strictEqual(response.body.data.contribution.amount, '15000.0000');
    });

    it('6. Member CANNOT create contribution on behalf of another member (403 Forbidden)', async () => {
      const response = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          userId: leaderUser.id,
          amount: 1000,
        });

      assert.strictEqual(response.status, 403);
      assert.match(response.body.error.message, /only create contributions for themselves/i);
    });

    it('7. Rejects negative or zero contribution amount (400)', async () => {
      const resZero = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 0 });

      assert.strictEqual(resZero.status, 400);

      const resNegative = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: -100 });

      assert.strictEqual(resNegative.status, 400);
    });

    it('8. Rejects contribution when investment has entered LOCKED status (400)', async () => {
      const response = await request(app)
        .post(`/api/investments/${lockedInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 5000 });

      assert.strictEqual(response.status, 400);
      assert.match(response.body.error.message, /OPEN status/i);
    });

    it('9. Cannot record contribution for a user outside the group (400)', async () => {
      const response = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          userId: outsiderUser.id,
          amount: 5000,
        });

      assert.strictEqual(response.status, 400);
      assert.match(response.body.error.message, /not a member of this investment group/i);
    });

    it('10. Outsider cannot contribute to an investment (403 Forbidden)', async () => {
      const response = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ amount: 5000 });

      assert.strictEqual(response.status, 403);
    });
  });

  // ==========================================
  // Contribution Retrieval & Summary Tests
  // ==========================================
  describe('Contribution Retrieval & Accounting Summary', () => {
    it('11. Member can view all contributions and authoritative summary', async () => {
      const response = await request(app)
        .get(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.ok(Array.isArray(response.body.data.contributions));
      assert.ok(response.body.data.contributions.length >= 3);

      // Verify exact Decimal totals computed on backend
      assert.ok(response.body.data.totalAmount);
      assert.ok(typeof response.body.data.totalAmount === 'string');
      assert.ok(response.body.data.contributorCount >= 2);
      assert.ok(Array.isArray(response.body.data.memberBreakdown));
    });

    it('12. Member can filter contributions by userId', async () => {
      const response = await request(app)
        .get(`/api/investments/${openInvId}/contributions?userId=${memberUser.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(response.status, 200);
      assert.ok(
        response.body.data.contributions.every(
          (c: { userId: string }) => c.userId === memberUser.id
        )
      );
    });

    it('13. Member can fetch single contribution by ID', async () => {
      // First get all contributions to get an ID
      const listRes = await request(app)
        .get(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`);
      const contribId = listRes.body.data.contributions[0].id;

      const singleRes = await request(app)
        .get(`/api/investments/${openInvId}/contributions/${contribId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(singleRes.status, 200);
      assert.strictEqual(singleRes.body.data.contribution.id, contribId);
      assert.ok(singleRes.body.data.contribution.amount);
    });

    it('14. Cross-group leader cannot view contributions of Group A (403 Forbidden)', async () => {
      const response = await request(app)
        .get(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${groupBLeaderToken}`);

      assert.strictEqual(response.status, 403);
    });
  });

  // ==========================================
  // Contribution Updates & Deletion Tests
  // ==========================================
  describe('Contribution Updates & Deletion Rules', () => {
    let memberContribId = '';

    before(async () => {
      // Create a fresh contribution for member
      const res = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          amount: 3000,
          notes: 'To be edited',
        });
      memberContribId = res.body.data.contribution.id;
    });

    it('15. Member can update their own contribution amount and notes while OPEN', async () => {
      const response = await request(app)
        .patch(`/api/investments/${openInvId}/contributions/${memberContribId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          amount: 4500,
          notes: 'Updated commitment amount',
        });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.data.contribution.amount, '4500.0000');
      assert.strictEqual(response.body.data.contribution.notes, 'Updated commitment amount');
    });

    it('16. Member cannot update another member contribution (403 Forbidden)', async () => {
      // Leader creates a contribution
      const leaderContribRes = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ amount: 8000 });
      const leaderContribId = leaderContribRes.body.data.contribution.id;

      const patchRes = await request(app)
        .patch(`/api/investments/${openInvId}/contributions/${leaderContribId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1000 });

      assert.strictEqual(patchRes.status, 403);
      assert.match(patchRes.body.error.message, /only update your own/i);
    });

    it('17. Leader can update a member contribution while OPEN', async () => {
      const response = await request(app)
        .patch(`/api/investments/${openInvId}/contributions/${memberContribId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ notes: 'Verified by Leader' });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.data.contribution.notes, 'Verified by Leader');
    });

    it('18. Member can delete/cancel their own contribution while OPEN', async () => {
      const res = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 1000 });
      const delId = res.body.data.contribution.id;

      const delRes = await request(app)
        .delete(`/api/investments/${openInvId}/contributions/${delId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(delRes.body.success, true);
    });

    it('19. Member cannot delete another member contribution (403 Forbidden)', async () => {
      const leaderContribRes = await request(app)
        .post(`/api/investments/${openInvId}/contributions`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ amount: 2000 });
      const leaderContribId = leaderContribRes.body.data.contribution.id;

      const delRes = await request(app)
        .delete(`/api/investments/${openInvId}/contributions/${leaderContribId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      assert.strictEqual(delRes.status, 403);
      assert.match(delRes.body.error.message, /only delete your own/i);
    });

    it('20. Freezing basis: Cannot modify or delete contributions after LOCKED (400)', async () => {
      // Create a fresh investment, contribute, then lock it
      const tempInvRes = await request(app)
        .post(`/api/groups/${testGroupAId}/investments`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          name: 'Lock Freeze Test',
          symbol: 'FREEZE',
          type: InvestmentType.STOCK,
        });
      const freezeInvId = tempInvRes.body.data.investment.id;

      // Transition to OPEN
      await request(app)
        .patch(`/api/investments/${freezeInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.OPEN });

      // Member contributes
      const contribRes = await request(app)
        .post(`/api/investments/${freezeInvId}/contributions`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 7500 });
      const freezeContribId = contribRes.body.data.contribution.id;

      // Lock investment
      await request(app)
        .patch(`/api/investments/${freezeInvId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ status: InvestmentStatus.LOCKED });

      // Attempt update by member -> rejected
      const patchRes = await request(app)
        .patch(`/api/investments/${freezeInvId}/contributions/${freezeContribId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 10000 });
      assert.strictEqual(patchRes.status, 400);
      assert.match(patchRes.body.error.message, /OPEN status/i);

      // Attempt update by leader -> rejected
      const leaderPatchRes = await request(app)
        .patch(`/api/investments/${freezeInvId}/contributions/${freezeContribId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ amount: 10000 });
      assert.strictEqual(leaderPatchRes.status, 400);

      // Attempt delete by member -> rejected
      const delRes = await request(app)
        .delete(`/api/investments/${freezeInvId}/contributions/${freezeContribId}`)
        .set('Authorization', `Bearer ${memberToken}`);
      assert.strictEqual(delRes.status, 400);
      assert.match(delRes.body.error.message, /OPEN status/i);

      // Attempt delete by leader -> rejected
      const leaderDelRes = await request(app)
        .delete(`/api/investments/${freezeInvId}/contributions/${freezeContribId}`)
        .set('Authorization', `Bearer ${leaderToken}`);
      assert.strictEqual(leaderDelRes.status, 400);
    });
  });
});
