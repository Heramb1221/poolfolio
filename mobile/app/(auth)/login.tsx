import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../src/hooks/useAuth';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { PressableScale } from '../../src/components/ui/PressableScale';
import { AuthShell } from '../../src/components/layout/AuthShell';
import { useToast } from '../../src/components/feedback/Toast';
import { colors, fonts } from '../../src/theme/tokens';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg(null);
    try {
      await login(data);
      toast.success('Welcome back', 'Signed in successfully');
      router.replace('/(app)/(tabs)');
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign in';
      setErrorMsg(msg);
      toast.error('Sign in failed', msg);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track group investments, ownership and settlements."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to Poolfolio? </Text>
          <PressableScale onPress={() => router.push('/(auth)/register')} hitSlop={8}>
            <Text style={styles.link}>Create account</Text>
          </PressableScale>
        </View>
      }
    >
      {errorMsg ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.error}>
          <Ionicons name="alert-circle" size={18} color={colors.loss} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </Animated.View>
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Password"
            icon="lock-closed-outline"
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.password?.message}
          />
        )}
      />

      <Button title="Sign in" icon="arrow-forward" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} style={{ marginTop: 6 }} />

      <View style={styles.trust}>
        <Ionicons name="shield-checkmark" size={14} color={colors.primaryDark} />
        <Text style={styles.trustText}>Server-verified ledger · bank-grade token storage</Text>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lossSoft,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.loss },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontFamily: fonts.sans, color: colors.ink2, fontSize: 14 },
  link: { fontFamily: fonts.sansBold, color: colors.primaryDark, fontSize: 14 },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  trustText: { fontFamily: fonts.sansMedium, fontSize: 11.5, color: colors.muted },
});
