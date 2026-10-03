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
import { useAuth } from '../../../src/hooks/useAuth';
import { useGroups } from '../../../src/hooks/useGroups';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
      {/* Header Greeting */}
      <View className="mb-6">
        <Text className="text-slate-400 text-sm">Welcome back,</Text>
        <Text className="text-white text-2xl font-bold">{user?.name || 'Investor'}</Text>
      </View>

      {/* Info Card */}
      <Card className="bg-sky-950/40 border-sky-800/80">
        <Text className="text-sky-300 font-semibold text-base mb-1">
          Server-Authoritative Accounting
        </Text>
        <Text className="text-slate-300 text-xs leading-5">
          All ownership ratios, profit/loss allocations, and member settlements are computed
          strictly by the backend ledger engine using exact decimal precision.
        </Text>
      </Card>

      {/* Active Groups Section */}
      <View className="flex-row justify-between items-center mb-3 mt-2">
        <Text className="text-white text-lg font-bold">Your Investment Groups</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/groups/create')}>
          <Text className="text-primary text-sm font-semibold">+ New Group</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#38bdf8" className="my-6" />
      ) : !groups || groups.length === 0 ? (
        <Card className="items-center py-8">
          <Text className="text-slate-400 text-center mb-4">
            You are not in any investment groups yet.
          </Text>
          <Button
            title="Create Your First Group"
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
            <Card className="hover:border-slate-600">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-white text-lg font-bold flex-1 mr-2">
                  {group.name}
                </Text>
                <Text className="text-primary text-xs font-semibold">View →</Text>
              </View>
              <View className="flex-row gap-4 mt-2">
                <Text className="text-slate-400 text-xs">
                  Members: <Text className="text-white font-medium">{group._count?.members ?? 0}</Text>
                </Text>
                <Text className="text-slate-400 text-xs">
                  Investments: <Text className="text-white font-medium">{group._count?.investments ?? 0}</Text>
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
