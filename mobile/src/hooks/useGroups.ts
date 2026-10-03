import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../api/groups.api';

export const useGroups = () => {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await groupsApi.getGroups();
      return res.groups;
    },
  });
};

export const useGroup = (groupId: string) => {
  return useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => {
      const res = await groupsApi.getGroup(groupId);
      return res.group;
    },
    enabled: !!groupId,
  });
};

export const useGroupMembers = (groupId: string) => {
  return useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: async () => {
      const res = await groupsApi.getGroupMembers(groupId);
      return res.members;
    },
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) => groupsApi.createGroup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};
