import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Button } from '../ui/Button';
import { colors, fonts } from '../../theme/tokens';

interface Options {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}

type ConfirmFn = (o: Options) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Replaces native Alert.alert with a branded bottom sheet. Resolves true/false. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (v: boolean) => {
    setOpen(false);
    resolver.current?.(v);
    resolver.current = null;
  };

  const danger = opts?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <BottomSheet visible={open} onClose={() => finish(false)} scroll={false}>
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: danger ? colors.lossSoft : colors.primaryTint }]}>
            <Ionicons
              name={opts?.icon ?? (danger ? 'warning' : 'help-circle')}
              size={30}
              color={danger ? colors.loss : colors.primaryDark}
            />
          </View>
          <Text style={styles.title}>{opts?.title}</Text>
          <Text style={styles.msg}>{opts?.message}</Text>
        </View>
        <View style={{ gap: 10, marginTop: 22 }}>
          <Button
            title={opts?.confirmLabel ?? 'Confirm'}
            variant={danger ? 'danger' : 'primary'}
            onPress={() => finish(true)}
          />
          <Button title={opts?.cancelLabel ?? 'Cancel'} variant="secondary" onPress={() => finish(false)} />
        </View>
      </BottomSheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const c = useContext(ConfirmContext);
  if (!c) throw new Error('useConfirm must be used within ConfirmProvider');
  return c;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 6 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.ink, textAlign: 'center' },
  msg: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink2, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
