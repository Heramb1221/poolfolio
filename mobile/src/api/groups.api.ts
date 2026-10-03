import { apiClient } from './client';
import { Group, GroupMember, GroupRole } from '../types/api';

export const groupsApi = {
  async getGroups(): Promise<{ groups: Group[] }> {
    return apiClient<{ groups: Group[] }>('/groups', {
      method: 'GET',
    });
  },

  async getGroup(groupId: string): Promise<{ group: Group }> {
    return apiClient<{ group: Group }>(`/groups/${groupId}`, {
      method: 'GET',
    });
  },

  async createGroup(input: { name: string }): Promise<{ group: Group }> {
    return apiClient<{ group: Group }>('/groups', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateGroup(groupId: string, input: { name: string }): Promise<{ group: Group }> {
    return apiClient<{ group: Group }>(`/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async deleteGroup(groupId: string): Promise<void> {
    return apiClient<void>(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  async getGroupMembers(groupId: string): Promise<{ members: GroupMember[] }> {
    return apiClient<{ members: GroupMember[] }>(`/groups/${groupId}/members`, {
      method: 'GET',
    });
  },

  async addMember(
    groupId: string,
    input: { userId: string; role?: GroupRole }
  ): Promise<{ member: GroupMember }> {
    return apiClient<{ member: GroupMember }>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateMemberRole(
    groupId: string,
    memberId: string,
    role: GroupRole
  ): Promise<{ member: GroupMember }> {
    return apiClient<{ member: GroupMember }>(`/groups/${groupId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async removeMember(groupId: string, memberId: string): Promise<void> {
    return apiClient<void>(`/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },
};
