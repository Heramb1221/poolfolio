import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app';
import prisma from '../config/prisma';
import authService from '../services/auth.service';

describe('Groups and Roles API (/api/groups)', () => {
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
  let coLeaderMemberId = '';
  let memberRecordId = '';
  let leaderMemberId = '';

  before(async () => {
    // Register test users
    const leaderRes = await authService.register({
      name: 'Leader User',
      email: `leader.${timestamp}@example.com`,
      password: 'Password123!',
    });
    leaderUser = leaderRes.user;
    leaderToken = leaderRes.token;

    const coLeaderRes = await authService.register({
      name: 'CoLeader User',
      email: `coleader.${timestamp}@example.com`,
      password: 'Password123!',
    });
    coLeaderUser = coLeaderRes.user;
    coLeaderToken = coLeaderRes.token;

    const memberRes = await authService.register({
      name: 'Member User',
      email: `member.${timestamp}@example.com`,
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
  });

  after(async () => {
    // Cleanup created groups and users
    if (testGroupId) {
      await prisma.group.deleteMany({
        where: { id: testGroupId },
      });
    }

    const testUserIds = [
      leaderUser?.id,
      coLeaderUser?.id,
      memberUser?.id,
      outsiderUser?.id,
    ].filter(Boolean) as string[];

    if (testUserIds.length > 0) {
      // First delete memberships in case groups still exist
      await prisma.groupMember.deleteMany({
        where: { userId: { in: testUserIds } },
      });
      await prisma.group.deleteMany({
        where: { createdById: { in: testUserIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
    }

    await prisma.$disconnect();
  });

  // ==========================================
  // Group Creation Tests
  // ==========================================
  describe('Group Creation', () => {
    it('1. authenticated user creates group', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: 'Alpha Investment Club' })
        .expect(201);

      assert.equal(response.body.success, true);
      assert.ok(response.body.data.group.id);
      assert.equal(response.body.data.group.name, 'Alpha Investment Club');
      assert.equal(response.body.data.group.createdById, leaderUser.id);
      assert.equal(response.body.data.group.currentUserRole, 'LEADER');

      // Verify no passwordHash is leaked
      assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);

      testGroupId = response.body.data.group.id;
    });

    it('2. unauthenticated user cannot create group', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({ name: 'Unauthorized Group' })
        .expect(401);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
    });

    it('3. creator automatically becomes LEADER', async () => {
      const membersInDb = await prisma.groupMember.findMany({
        where: { groupId: testGroupId },
      });

      assert.equal(membersInDb.length, 1);
      assert.equal(membersInDb[0].userId, leaderUser.id);
      assert.equal(membersInDb[0].role, 'LEADER');
      leaderMemberId = membersInDb[0].id;
    });
  });

  // ==========================================
  // Group Access Tests
  // ==========================================
  describe('Group Access', () => {
    it('4. leader can access group', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(response.body.data.group.id, testGroupId);
      assert.equal(response.body.data.group.currentUserRole, 'LEADER');
      assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);
    });

    it('6. non-member cannot access private group data', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'FORBIDDEN');
    });

    it('non-member does not see group in GET /api/groups list', async () => {
      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(
        response.body.data.groups.some((g: { id: string }) => g.id === testGroupId),
        false
      );
    });
  });

  // ==========================================
  // Member Management Tests
  // ==========================================
  describe('Member Management', () => {
    it('7. leader can add member', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ userId: memberUser.id, role: 'MEMBER' })
        .expect(201);

      assert.equal(response.body.success, true);
      assert.equal(response.body.data.member.userId, memberUser.id);
      assert.equal(response.body.data.member.role, 'MEMBER');
      assert.ok(response.body.data.member.user);
      assert.equal(response.body.data.member.user.email, memberUser.email);
      assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);

      memberRecordId = response.body.data.member.id;
    });

    it('5. member can access group after being added', async () => {
      const response = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(response.body.data.group.id, testGroupId);
      assert.equal(response.body.data.group.currentUserRole, 'MEMBER');
    });

    it('8. duplicate member is rejected', async () => {
      const response = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ userId: memberUser.id })
        .expect(409);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'CONFLICT');
      assert.ok(response.body.error.message.includes('already a member'));
    });

    it('9. nonexistent user is rejected', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ userId: fakeUserId })
        .expect(404);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'NOT_FOUND');
    });

    it('10. authorized user can view members', async () => {
      // Member can view group members
      const memberViewRes = await request(app)
        .get(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      assert.equal(memberViewRes.body.success, true);
      assert.equal(memberViewRes.body.data.members.length, 2);
      assert.equal(JSON.stringify(memberViewRes.body).includes('passwordHash'), false);

      // Leader can view group members
      const leaderViewRes = await request(app)
        .get(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .expect(200);

      assert.equal(leaderViewRes.body.success, true);
      assert.equal(leaderViewRes.body.data.members.length, 2);
    });

    it('11. unauthorized user cannot manage members', async () => {
      // Outsider cannot add member
      const outsiderAddRes = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ userId: coLeaderUser.id })
        .expect(403);

      assert.equal(outsiderAddRes.body.success, false);
      assert.equal(outsiderAddRes.body.error.code, 'FORBIDDEN');

      // Regular MEMBER cannot add another member
      const memberAddRes = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: coLeaderUser.id })
        .expect(403);

      assert.equal(memberAddRes.body.success, false);
      assert.equal(memberAddRes.body.error.code, 'FORBIDDEN');
    });
  });

  // ==========================================
  // Role Management Tests
  // ==========================================
  describe('Roles and Permissions', () => {
    it('12. leader can assign CO_LEADER', async () => {
      // Leader adds coLeaderUser as CO_LEADER
      const addRes = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ userId: coLeaderUser.id, role: 'CO_LEADER' })
        .expect(201);

      assert.equal(addRes.body.success, true);
      assert.equal(addRes.body.data.member.role, 'CO_LEADER');
      coLeaderMemberId = addRes.body.data.member.id;

      // Leader can also promote existing MEMBER to CO_LEADER
      const patchRes = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${memberRecordId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ role: 'CO_LEADER' })
        .expect(200);

      assert.equal(patchRes.body.success, true);
      assert.equal(patchRes.body.data.member.role, 'CO_LEADER');

      // Demote back to MEMBER for further testing
      await request(app)
        .patch(`/api/groups/${testGroupId}/members/${memberRecordId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ role: 'MEMBER' })
        .expect(200);
    });

    it('13. member cannot change roles', async () => {
      const response = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${memberRecordId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'CO_LEADER' })
        .expect(403);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'FORBIDDEN');
    });

    it('14. co-leader cannot remove leader', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${leaderMemberId}`)
        .set('Authorization', `Bearer ${coLeaderToken}`)
        .expect(400);

      assert.equal(response.body.success, false);
      assert.ok(response.body.error.message.includes('leader cannot be removed'));
    });

    it('15. member cannot remove another member', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${coLeaderMemberId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'FORBIDDEN');
    });

    it('16. leader cannot accidentally remove themselves', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroupId}/members/${leaderMemberId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .expect(400);

      assert.equal(response.body.success, false);
      assert.ok(response.body.error.message.includes('leader cannot be removed'));
    });

    it('17. system cannot create multiple leaders', async () => {
      // Adding member with LEADER role is rejected
      const addLeaderRes = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ email: `extra.${Date.now()}@example.com`, role: 'LEADER' })
        .expect(400);

      assert.equal(addLeaderRes.body.success, false);
      assert.ok(addLeaderRes.body.error.message.includes('leader'));

      // Promoting a member to LEADER is rejected
      const promoteRes = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${coLeaderMemberId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ role: 'LEADER' })
        .expect(400);

      assert.equal(promoteRes.body.success, false);
      assert.ok(promoteRes.body.error.message.includes('leader'));

      // Demoting existing LEADER is rejected
      const demoteLeaderRes = await request(app)
        .patch(`/api/groups/${testGroupId}/members/${leaderMemberId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ role: 'MEMBER' })
        .expect(400);

      assert.equal(demoteLeaderRes.body.success, false);
      assert.ok(demoteLeaderRes.body.error.message.includes('leader'));
    });
  });

  // ==========================================
  // Group Update and Deletion Tests
  // ==========================================
  describe('Group Update & Deletion', () => {
    it('leader can update group name', async () => {
      const response = await request(app)
        .patch(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({ name: 'Alpha Investment Club Updated' })
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(response.body.data.group.name, 'Alpha Investment Club Updated');
    });

    it('non-leader cannot update group name', async () => {
      const response = await request(app)
        .patch(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${coLeaderToken}`)
        .send({ name: 'Hacked Club' })
        .expect(403);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'FORBIDDEN');
    });

    it('21. unauthenticated user cannot delete group', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .expect(401);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'UNAUTHORIZED');
    });

    it('20. member cannot delete group', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'FORBIDDEN');
    });

    it('19. co-leader cannot delete group', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${coLeaderToken}`)
        .expect(403);

      assert.equal(response.body.success, false);
      assert.equal(response.body.error.code, 'FORBIDDEN');
    });

    it('18. leader can delete group', async () => {
      const response = await request(app)
        .delete(`/api/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .expect(200);

      assert.equal(response.body.success, true);
      assert.equal(response.body.message, 'Group deleted successfully');

      // Verify group is gone from DB
      const dbGroup = await prisma.group.findUnique({
        where: { id: testGroupId },
      });
      assert.equal(dbGroup, null);

      // Verify cascade deleted group members
      const dbMembers = await prisma.groupMember.findMany({
        where: { groupId: testGroupId },
      });
      assert.equal(dbMembers.length, 0);

      // Mark as deleted so after hook doesn't fail
      testGroupId = '';
    });
  });
});
