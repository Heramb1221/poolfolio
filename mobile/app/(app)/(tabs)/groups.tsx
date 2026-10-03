import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGroups } from '../../../src/hooks/useGroups';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';

export default function GroupsTabScreen() {
  const router = useRouter();
  const { data: groups, isLoading, isRefetching, refetch } = useGroups();

  return (
    <ScrollView
      className="flex-1 bg-background px-4 py-6"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#38bdf8"
        />
      }
    >
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-xl font-bold">Groups</Text>
        <Button
          title="+ Create Group"
          onPress={() => router.push('/(app)/groups/create')}
          className="py-2 px-3"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#38bdf8" className="my-6" />
      ) : !groups || groups.length === 0 ? (
        <Card className="items-center py-8">
          <Text className="text-slate-400 text-center mb-4">No groups found.</Text>
          <Button
            title="Create a Group"
            onPress={() => router.push('/(app)/groups/create')}
          />
        </Card>
      ) : (
        groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            activeOpacity={0.8}
            onPress={() => router.push(`/(app)/groups/${group.id}` as any)}
          >
            <Card>
              <Text className="text-white text-lg font-bold mb-1">{group.name}</Text>
              <Text className="text-slate-400 text-xs mb-3">
                Created: {new Date(group.createdAt).toLocaleDateString()}
              </Text>
              <View className="flex-row justify-between items-center border-t border-border pt-3">
                <Text className="text-slate-400 text-xs">
                  {group._count?.members ?? 0} members · {group._count?.investments ?? 0} investments
                </Text>
                <Text className="text-primary text-xs font-semibold">Open →</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
