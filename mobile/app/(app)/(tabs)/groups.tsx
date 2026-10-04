import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useGroups } from '../../../src/hooks/useGroups';
import { Screen } from '../../../src/components/layout/Screen';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { PressableScale } from '../../../src/components/ui/PressableScale';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LoadingBlock } from '../../../src/components/ui/Spinner';
import { GroupRow } from '../../../src/components/portfolio/Rows';
import { colors, fonts, gradients, shadow } from '../../../src/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { enter } from '../../../src/theme/motion';

export default function GroupsTabScreen() {
  const router = useRouter();
  const { data: groups, isLoading, isRefetching, refetch } = useGroups();

  return (
    <Screen tabBar refreshing={isRefetching} onRefresh={refetch}>
      <Animated.View entering={enter(0)} style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Groups</Text>
          <Text style={styles.sub}>{groups?.length ?? 0} investment pool{(groups?.length ?? 0) === 1 ? '' : 's'}</Text>
        </View>
        <PressableScale onPress={() => router.push('/(app)/groups/create')} style={[styles.newBtn, shadow.glow]}>
          <LinearGradient colors={gradients.primary} style={styles.newFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.newText}>New</Text>
          </LinearGradient>
        </PressableScale>
      </Animated.View>

      {isLoading ? (
        <LoadingBlock />
      ) : !groups || groups.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="people-outline"
            title="No groups yet"
            message="Pools you create or get invited to will show up here."
            actionLabel="Create a group"
            onAction={() => router.push('/(app)/groups/create')}
          />
        </GlassCard>
      ) : (
        groups.map((g, i) => (
          <GroupRow key={g.id} group={g} index={i} onPress={() => router.push(`/(app)/groups/${g.id}` as any)} />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  title: { fontFamily: fonts.sansBold, fontSize: 30, color: colors.ink, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.muted, marginTop: 1 },
  newBtn: { borderRadius: 16 },
  newFill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16 },
  newText: { fontFamily: fonts.sansBold, color: colors.white, fontSize: 14 },
});
