import React, { useEffect, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../ui/PressableScale';
import { colors, fonts, shadow } from '../../theme/tokens';

const { height: SCREEN_H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Disable swipe/backdrop dismissal while work is in flight. */
  locked?: boolean;
  /** Scrollable body (default true). Turn off for short, fixed sheets. */
  scroll?: boolean;
  maxHeightRatio?: number;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  locked = false,
  scroll = true,
  maxHeightRatio = 0.88,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = withSpring(0, { damping: 24, stiffness: 240, mass: 0.9 });
      backdrop.value = withTiming(1, { duration: 220 });
    } else {
      backdrop.value = withTiming(0, { duration: 200 });
      y.value = withTiming(SCREEN_H, { duration: 240 }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, y, backdrop]);

  const pan = Gesture.Pan()
    .enabled(!locked)
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        y.value = withSpring(0, { damping: 24, stiffness: 240 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  const body = (
    <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>{children}</View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => !locked && onClose()} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backStyle]}>
          <Pressable style={{ flex: 1 }} onPress={() => !locked && onClose()} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, shadow.float, { maxHeight: SCREEN_H * maxHeightRatio }, sheetStyle]}>
            <GestureDetector gesture={pan}>
              <View collapsable={false}>
                <View style={styles.handleWrap}>
                  <View style={styles.handle} />
                </View>
                {title ? (
                  <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{title}</Text>
                      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
                    </View>
                    {!locked ? (
                      <PressableScale onPress={onClose} style={styles.close} scaleTo={0.9} hitSlop={8}>
                        <Ionicons name="close" size={18} color={colors.ink2} />
                      </PressableScale>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </GestureDetector>

            {scroll ? (
              <ScrollView
                bounces={false}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {body}
              </ScrollView>
            ) : (
              body
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(6,30,20,0.45)' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 8 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
  title: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink2, marginTop: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(11,31,23,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
