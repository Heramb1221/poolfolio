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

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMsg(null);
    try {
      await register(data);
      toast.success('Account created', 'Welcome to Poolfolio');
      router.replace('/(app)/(tabs)');
    } catch (err: any) {
      const msg = err?.message || 'Failed to create account';
      setErrorMsg(msg);
      toast.error('Sign up failed', msg);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Pool investments with friends, with transparent accounting."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <PressableScale onPress={() => router.push('/(auth)/login')} hitSlop={8}>
            <Text style={styles.link}>Sign in</Text>
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
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Full name"
            icon="person-outline"
            placeholder="Alex Johnson"
            autoCapitalize="words"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.name?.message}
          />
        )}
      />
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
            label="Password (min 8 characters)"
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

      <Button title="Create account" icon="arrow-forward" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting} style={{ marginTop: 6 }} />
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
});
