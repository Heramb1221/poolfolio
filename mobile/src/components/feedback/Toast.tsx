import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../ui/PressableScale';
import { colors, fonts, shadow } from '../../theme/tokens';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface Ctx {
  show: (t: { type?: ToastType; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<Ctx | null>(null);

const meta: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: colors.gain, bg: colors.gainSoft },
  error: { icon: 'close-circle', color: colors.loss, bg: colors.lossSoft },
  info: { icon: 'information-circle', color: colors.info, bg: colors.infoSoft },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback<Ctx['show']>(
    ({ type = 'info', title, message }) => {
      if (timer.current) clearTimeout(timer.current);
      idRef.current += 1;
      setToast({ id: idRef.current, type, title, message });
      timer.current = setTimeout(() => setToast(null), type === 'error' ? 4200 : 2800);
    },
    []
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value: Ctx = {
    show,
    success: (title, message) => show({ type: 'success', title, message }),
    error: (title, message) => show({ type: 'error', title, message }),
    info: (title, message) => show({ type: 'info', title, message }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
        {toast ? (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(260)}
            exiting={FadeOutUp.duration(200)}
            style={[styles.wrap, { top: insets.top + 8 }]}
          >
            <PressableScale onPress={dismiss} scaleTo={0.98} style={[styles.toast, shadow.float]}>
              <View style={[styles.iconWrap, { backgroundColor: meta[toast.type].bg }]}>
                <Ionicons name={meta[toast.type].icon} size={22} color={meta[toast.type].color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {toast.title}
                </Text>
                {toast.message ? (
                  <Text style={styles.msg} numberOfLines={2}>
                    {toast.message}
                  </Text>
                ) : null}
              </View>
            </PressableScale>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const c = useContext(ToastContext);
  if (!c) throw new Error('useToast must be used within ToastProvider');
  return c;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.sansBold, fontSize: 14.5, color: colors.ink },
  msg: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.ink2, marginTop: 1 },
});
