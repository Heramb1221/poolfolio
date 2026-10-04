import { Platform } from 'react-native';

/**
 * Poolfolio design tokens — light, emerald, glass.
 * Every screen and component reads from here; never hard-code colours.
 */
export const colors = {
  bg: '#F3F7F5',
  bgAlt: '#E9F1ED',
  surface: '#FFFFFF',
  glass: 'rgba(255,255,255,0.72)',
  glassStrong: 'rgba(255,255,255,0.88)',
  border: 'rgba(11,31,23,0.08)',
  borderStrong: 'rgba(11,31,23,0.14)',

  ink: '#0B1F17',
  ink2: '#4A5E55',
  muted: '#7C8D85',
  faint: '#B5C2BB',

  primary: '#10B981',
  primaryDark: '#047857',
  primaryDeep: '#064E3B',
  primarySoft: '#D9F5E8',
  primaryTint: 'rgba(16,185,129,0.12)',

  gain: '#059669',
  gainSoft: 'rgba(5,150,105,0.12)',
  loss: '#DC2626',
  lossSoft: 'rgba(220,38,38,0.10)',
  warn: '#D97706',
  warnSoft: 'rgba(217,119,6,0.12)',
  info: '#2563EB',
  infoSoft: 'rgba(37,99,235,0.10)',

  white: '#FFFFFF',
  onHero: '#FFFFFF',
  onHeroMuted: 'rgba(255,255,255,0.72)',
} as const;

export const gradients = {
  hero: ['#064E3B', '#047857', '#10B981'] as const,
  primary: ['#10B981', '#059669'] as const,
  danger: ['#EF4444', '#DC2626'] as const,
  authHero: ['#064E3B', '#065F46', '#10B981'] as const,
  page: ['#F3F7F5', '#E9F1ED'] as const,
};

export const fonts = {
  sans: 'SpaceGrotesk_400Regular',
  sansMedium: 'SpaceGrotesk_500Medium',
  sansSemi: 'SpaceGrotesk_600SemiBold',
  sansBold: 'SpaceGrotesk_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#0B3B2A',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 3, shadowColor: '#0B3B2A' },
  }) as object,
  float: Platform.select({
    ios: {
      shadowColor: '#0B3B2A',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
    },
    default: { elevation: 12, shadowColor: '#0B3B2A' },
  }) as object,
  glow: Platform.select({
    ios: {
      shadowColor: '#10B981',
      shadowOpacity: 0.45,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 8, shadowColor: '#10B981' },
  }) as object,
};

/** Bottom padding screens need so content clears the floating tab bar. */
export const TAB_BAR_CLEARANCE = 120;
