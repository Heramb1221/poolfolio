import React from 'react';
import { RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, TAB_BAR_CLEARANCE } from '../../theme/tokens';

interface Props {
  children: React.ReactNode;
  header?: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Reserve room for the floating tab bar. */
  tabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAware?: boolean;
}

export function Screen({
  children,
  header,
  scroll = true,
  refreshing = false,
  onRefresh,
  tabBar = false,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottom = tabBar ? TAB_BAR_CLEARANCE : insets.bottom + 32;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.page} style={StyleSheet.absoluteFill} />
      {/* Decorative glass-light blobs */}
      <View pointerEvents="none" style={[styles.blob, styles.blobA]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobB]} />

      <View style={{ paddingTop: insets.top }} />
      {header}

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingHorizontal: 20, paddingBottom: bottom }, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  blob: { position: 'absolute', borderRadius: 999 },
  blobA: { width: 320, height: 320, top: -120, right: -100, backgroundColor: 'rgba(16,185,129,0.14)' },
  blobB: { width: 260, height: 260, bottom: 120, left: -120, backgroundColor: 'rgba(4,120,87,0.07)' },
});
