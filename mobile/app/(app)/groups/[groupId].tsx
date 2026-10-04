import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useGroup, useGroupMembers } from '../../../src/hooks/useGroups';
import { useGroupInvestments } from '../../../src/hooks/useInvestments';
import { useAuth } from '../../../src/hooks/useAuth';
import { Screen } from '../../../src/components/layout/Screen';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { Avatar } from '../../../src/components/ui/Avatar';
import { RoleBadge } from '../../../src/components/ui/Badge';
import { SectionHeader } from '../../../src/components/ui/SectionHeader';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LoadingBlock } from '../../../src/components/ui/Spinner';
import { InvestmentRow } from '../../../src/components/portfolio/Rows';
import { colors, fonts, gradients, shadow } from '../../../src/theme/tokens';
import { shortDate } from '../../../src/theme/format';
import { enter } from '../../../src/theme/motion';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: group, isLoading: groupLoading, refetch: refetchGroup, isRefetching } = useGroup(groupId);
  const { data: members, refetch: refetchMembers } = useGroupMembers(groupId);
  const { data: investments, isLoading: invLoading, refetch: refetchInvestments } = useGroupInvestments(groupId);

  const onRefresh = () => {
    refetchGroup();
    refetchMembers();
    refetchInvestments();
  };

  const myRole = members?.find((m) => m.userId === user?.id)?.role;
  const newInvestment = () => router.push({ pathname: '/(app)/investments/create', params: { groupId } });

  if (groupLoading) {
    return (
      <Screen scroll={false} header={<ScreenHeader title="Group" />}>
        <LoadingBlock fill label="Loading group…" />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen scroll={false} header={<ScreenHeader title="Group" />}>
        <GlassCard>
          <EmptyState icon="alert-circle-outline" title="Group not found" message="It may have been removed or you no longer have access." actionLabel="Go back" actionIcon="arrow-back" onAction={() => router.back()} />
        </GlassCard>
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={isRefetching}
      onRefresh={onRefresh}
      header={
        <ScreenHeader
          title={group.name}
          subtitle={`Created ${shortDate(group.createdAt)}`}
          right={myRole ? <RoleBadge role={myRole} /> : undefined}
        />
      }
    >
      {/* Summary hero */}
      <Animated.View entering={enter(0)} style={[styles.heroShadow, shadow.glow]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.orb} />
          {[
            { icon: 'people' as const, v: members?.length ?? group._count?.members ?? 0, l: 'Members' },
            { icon: 'layers' as const, v: investments?.length ?? group._count?.investments ?? 0, l: 'Investments' },
            {
              icon: 'flash' as const,
              v: investments?.filter((i) => i.status === 'ACTIVE').length ?? 0,
              l: 'Active',
            },
          ].map((s, i) => (
            <View key={s.l} style={[styles.heroStat, i > 0 && styles.divider]}>
              <Ionicons name={s.icon} size={16} color={colors.onHeroMuted} />
              <Text style={styles.heroV}>{s.v}</Text>
              <Text style={styles.heroL}>{s.l}</Text>
            </View>
          ))}
        </LinearGradient>
      </Animated.View>

      <SectionHeader title="Investments" action="New" onAction={newInvestment} />
      {invLoading ? (
        <LoadingBlock />
      ) : !investments || investments.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="trending-up-outline"
            title="No investments yet"
            message="Add a stock or IPO to start collecting member contributions."
            actionLabel="Create investment"
            onAction={newInvestment}
          />
        </GlassCard>
      ) : (
        investments.map((inv, i) => (
          <InvestmentRow
            key={inv.id}
            index={i}
            investment={inv}
            onPress={() => router.push(`/(app)/investments/${inv.id}` as any)}
          />
        ))
      )}

      <SectionHeader title="Members" right={`${members?.length ?? 0} total`} />
      <GlassCard padded={false}>
        {!members || members.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text style={styles.empty}>No members found.</Text>
          </View>
        ) : (
          members.map((m, i) => (
            <Animated.View
              key={m.id}
              entering={enter(i)}
              style={[styles.member, i < members.length - 1 && styles.border]}
            >
              <Avatar name={m.user?.name} size={40} index={i} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mName} numberOfLines={1}>
                  {m.user?.name || 'Group member'}
                  {m.userId === user?.id ? '  (you)' : ''}
                </Text>
                <Text style={styles.mEmail} numberOfLines={1}>
                  {m.user?.email}
                </Text>
              </View>
              <RoleBadge role={m.role} />
            </Animated.View>
          ))
        )}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroShadow: { borderRadius: 24, marginBottom: 8 },
  hero: { borderRadius: 24, paddingVertical: 18, flexDirection: 'row', overflow: 'hidden' },
  orb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -60, top: -90, backgroundColor: 'rgba(255,255,255,0.09)' },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  heroV: { fontFamily: fonts.monoBold, fontSize: 26, color: colors.white },
  heroL: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.onHeroMuted },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  mName: { fontFamily: fonts.sansBold, fontSize: 14.5, color: colors.ink },
  mEmail: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 1 },
  empty: { fontFamily: fonts.sans, color: colors.ink2 },
});
