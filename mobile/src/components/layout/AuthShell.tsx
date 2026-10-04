import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, gradients, shadow } from '../../theme/tokens';

/** Shared chrome for login / register: gradient hero + frosted form card. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <LinearGradient
          colors={gradients.authHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 28 }]}
        >
          <View style={[styles.orb, { width: 240, height: 240, top: -80, right: -70 }]} />
          <View style={[styles.orb, { width: 150, height: 150, bottom: -40, left: -40, opacity: 0.6 }]} />
          <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 260" preserveAspectRatio="none">
            <Defs>
              <SvgGrad id="decor" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#fff" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#fff" stopOpacity={0.35} />
                <Stop offset="1" stopColor="#fff" stopOpacity={0.12} />
              </SvgGrad>
            </Defs>
            <Path
              d="M0 200 C 50 190, 80 150, 130 160 S 210 110, 250 120 S 330 60, 400 40"
              stroke="url(#decor)"
              strokeWidth={2.5}
              fill="none"
            />
          </Svg>

          <Animated.View entering={FadeIn.duration(500)} style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons name="trending-up" size={22} color={colors.white} />
            </View>
            <Text style={styles.brand}>Poolfolio</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View entering={FadeInDown.duration(500).delay(180)} style={[styles.cardWrap, shadow.float]}>
          <View style={styles.card}>
            {Platform.OS === 'ios' ? <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} /> : null}
            <View style={{ padding: 22, backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.97)' }}>
              {children}
            </View>
          </View>
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 72, overflow: 'hidden', borderBottomLeftRadius: 36, borderBottomRightRadius: 36 },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 34 },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontFamily: fonts.sansBold, fontSize: 22, color: colors.white, letterSpacing: -0.3 },
  title: { fontFamily: fonts.sansBold, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14.5, color: colors.onHeroMuted, marginTop: 6, lineHeight: 21 },
  cardWrap: { marginHorizontal: 20, marginTop: -48, borderRadius: 28, backgroundColor: colors.surface },
  card: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  footer: { alignItems: 'center', paddingTop: 22, flexGrow: 1, justifyContent: 'flex-end' },
});
