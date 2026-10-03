import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGroup, useGroupMembers } from '../../../src/hooks/useGroups';
import { useGroupInvestments } from '../../../src/hooks/useInvestments';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { StatusBadge, RoleBadge } from '../../../src/components/ui/Badge';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();

  const { data: group, isLoading: groupLoading, refetch: refetchGroup } = useGroup(groupId);
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = useGroupMembers(groupId);
  const {
    data: investments,
    isLoading: investmentsLoading,
    refetch: refetchInvestments,
  } = useGroupInvestments(groupId);

  const isRefreshing = groupLoading || membersLoading || investmentsLoading;

  const onRefresh = () => {
    refetchGroup();
    refetchMembers();
    refetchInvestments();
  };

  if (groupLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-4">
        <Text className="text-white text-lg font-bold mb-2">Group Not Found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background px-4 py-6"
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
      }
    >
      {/* Group Header */}
      <View className="mb-6">
        <Text className="text-white text-2xl font-bold">{group.name}</Text>
        <Text className="text-slate-400 text-xs mt-1">
          Created on {new Date(group.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Investments Section */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-white text-lg font-bold">Investments</Text>
        <Button
          title="+ New Investment"
          onPress={() => router.push({ pathname: '/(app)/investments/create', params: { groupId } })}
          className="py-1.5 px-3"
        />
      </View>

      {!investments || investments.length === 0 ? (
        <Card className="items-center py-6 mb-6">
          <Text className="text-slate-400 text-sm mb-3">No investments in this group yet.</Text>
          <Button
            title="Create Investment"
            onPress={() => router.push({ pathname: '/(app)/investments/create', params: { groupId } })}
          />
        </Card>
      ) : (
        investments.map((inv) => (
          <TouchableOpacity
            key={inv.id}
            activeOpacity={0.8}
            onPress={() => router.push(`/(app)/investments/${inv.id}` as any)}
          >
            <Card className="mb-3">
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-white text-base font-bold">{inv.name}</Text>
                  <Text className="text-primary text-xs font-mono font-semibold">
                    {inv.symbol} · {inv.type}
                  </Text>
                </View>
                <StatusBadge status={inv.status} />
              </View>
              <View className="flex-row justify-between items-center border-t border-border pt-2 mt-2">
                <Text className="text-slate-400 text-xs">
                  {inv._count?.contributions ?? 0} contributions · {inv._count?.transactions ?? 0} events
                </Text>
                <Text className="text-primary text-xs font-semibold">Details →</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}

      {/* Members Section */}
      <View className="flex-row justify-between items-center mb-3 mt-4">
        <Text className="text-white text-lg font-bold">Group Members</Text>
        <Text className="text-slate-400 text-xs">Total: {members?.length ?? 0}</Text>
      </View>

      <Card>
        {!members || members.length === 0 ? (
          <Text className="text-slate-400 text-sm">No members found.</Text>
        ) : (
          members.map((m, index) => (
            <View
              key={m.id}
              className={`py-3 flex-row justify-between items-center ${
                index < members.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <View>
                <Text className="text-white font-medium text-sm">
                  {m.user?.name || 'Group Member'}
                </Text>
                <Text className="text-slate-400 text-xs">{m.user?.email}</Text>
              </View>
              <RoleBadge role={m.role} />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}
