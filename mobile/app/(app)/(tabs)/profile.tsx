import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { useAuth } from '../../../src/hooks/useAuth';
import { usePortfolio } from '../../../src/hooks/usePortfolio';
import { Screen } from '../../../src/components/layout/Screen';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button } from '../../../src/components/ui/Button';
import { PressableScale } from '../../../src/components/ui/PressableScale';
import { useToast } from '../../../src/components/feedback/Toast';
import { useConfirm } from '../../../src/components/feedback/ConfirmProvider';
import { colors, fonts, gradients, shadow } from '../../../src/theme/tokens';
import { shortDate } from '../../../src/theme/format';
import { enter } from '../../../src/theme/motion';

function InfoRow({
  icon,
  label,
  value,
  onPress,
  last,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  mono?: boolean;
}) {
  const body = (
    <View style={[styles.infoRow, !last && styles.infoBorder]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.primaryDark} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? (
        <Text style={[styles.infoValue, mono && { fontFamily: fonts.mono, fontSize: 12 }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.faint} /> : null}
    </View>
  );
  return onPress ? <PressableScale onPress={onPress} scaleTo={0.985}>{body}</PressableScale> : body;
}

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const p = usePortfolio();
  const toast = useToast();
  const confirm = useConfirm();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your groups and investments.',
      confirmLabel: 'Sign out',
      tone: 'danger',
      icon: 'log-out',
    });
    if (ok) {
      await logout();
    }
  };

  const soon = (what: string) => () => toast.info(what, 'This page is coming in a future release.');

  return (
    <Screen tabBar>
      <Animated.View entering={enter(0)} style={[styles.heroShadow, shadow.glow]}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.orb} />
          <View style={styles.avatarRing}>
            <Avatar name={user?.name} size={76} />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.statRow}>
            {[
              { v: p.counts.groups, l: 'Groups' },
              { v: p.counts.investments, l: 'Investments' },
              { v: p.counts.active, l: 'Active' },
            ].map((s, i) => (
              <View key={s.l} style={[styles.stat, i > 0 && styles.statDivider]}>
                <Text style={styles.statV}>{s.v}</Text>
                <Text style={styles.statL}>{s.l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <GlassCard padded={false}>
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="calendar-outline" label="Member since" value={shortDate(user?.createdAt)} />
          <InfoRow icon="finger-print-outline" label="User ID" value={user?.id ? `${user.id.slice(0, 8)}…` : '—'} mono last />
        </GlassCard>
      </Animated.View>

      <Animated.View entering={enter(2)}>
        <Text style={styles.sectionLabel}>ABOUT & HELP</Text>
        <GlassCard padded={false}>
          <InfoRow icon="help-buoy-outline" label="Help & support" onPress={soon('Help & support')} />
          <InfoRow icon="document-text-outline" label="Terms of service" onPress={soon('Terms of service')} />
          <InfoRow icon="lock-closed-outline" label="Privacy policy" onPress={soon('Privacy policy')} />
          <InfoRow icon="information-circle-outline" label="Version" value={`v${version}`} mono last />
        </GlassCard>
      </Animated.View>

      <Animated.View entering={enter(3)}>
        <Text style={[styles.sectionLabel, { color: colors.loss }]}>DANGER ZONE</Text>
        <GlassCard style={{ borderColor: colors.lossSoft }}>
          <Text style={styles.dangerText}>Signing out removes your session from this device. Your ledger stays safe on the server.</Text>
          <Button title="Sign out" variant="danger" icon="log-out-outline" onPress={handleLogout} isLoading={isLoading} />
        </GlassCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroShadow: { borderRadius: 28, marginBottom: 6, marginTop: 4 },
  hero: { borderRadius: 28, padding: 22, alignItems: 'center', overflow: 'hidden' },
  orb: { position: 'absolute', width: 240, height: 240, borderRadius: 120, top: -110, right: -80, backgroundColor: 'rgba(255,255,255,0.09)' },
  avatarRing: { padding: 4, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 12 },
  name: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.white, letterSpacing: -0.4 },
  email: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.onHeroMuted, marginTop: 2 },
  statRow: { flexDirection: 'row', marginTop: 20, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  statV: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.white },
  statL: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.onHeroMuted, marginTop: 1 },
  sectionLabel: { fontFamily: fonts.sansBold, fontSize: 11.5, letterSpacing: 1.4, color: colors.muted, marginTop: 20, marginBottom: 10, marginLeft: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontFamily: fonts.sansSemi, fontSize: 14.5, color: colors.ink },
  infoValue: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink2, maxWidth: 170 },
  dangerText: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink2, lineHeight: 19, marginBottom: 14 },
});
