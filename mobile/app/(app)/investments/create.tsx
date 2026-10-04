import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCreateInvestment } from '../../../src/hooks/useInvestments';
import { Screen } from '../../../src/components/layout/Screen';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { OptionPills } from '../../../src/components/ui/SegmentedTabs';
import { useToast } from '../../../src/components/feedback/Toast';
import { colors, fonts } from '../../../src/theme/tokens';
import { enter } from '../../../src/theme/motion';

const createInvestmentSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  symbol: z.string().trim().min(1, 'Symbol is required').toUpperCase(),
  type: z.enum(['STOCK', 'IPO']),
  exchange: z.string().trim().optional(),
  broker: z.string().trim().optional(),
});
type CreateInvestmentFormData = z.infer<typeof createInvestmentSchema>;

export default function CreateInvestmentScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const toast = useToast();
  const createMutation = useCreateInvestment(groupId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvestmentFormData>({
    resolver: zodResolver(createInvestmentSchema),
    defaultValues: { name: '', symbol: '', type: 'STOCK', exchange: '', broker: '' },
  });

  const selectedType = watch('type');

  const onSubmit = async (data: CreateInvestmentFormData) => {
    setErrorMsg(null);
    try {
      await createMutation.mutateAsync({
        ...data,
        exchange: data.exchange || undefined,
        broker: data.broker || undefined,
      });
      toast.success('Investment created', 'Saved in DRAFT. Open it when ready to collect contributions.');
      router.back();
    } catch (err: any) {
      const msg = err?.message || 'Failed to create investment';
      setErrorMsg(msg);
      toast.error('Could not create investment', msg);
    }
  };

  return (
    <Screen header={<ScreenHeader title="New investment" subtitle="Starts in DRAFT" modal />}>
      <Animated.View entering={enter(0)} style={styles.note}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.noteText}>Move it to OPEN when you are ready to collect member contributions.</Text>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <GlassCard>
          {errorMsg ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
              <Ionicons name="alert-circle" size={17} color={colors.loss} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </Animated.View>
          ) : null}

          <Text style={styles.label}>Investment type</Text>
          <View style={{ marginBottom: 18 }}>
            <OptionPills
              options={[
                { id: 'STOCK', label: 'STOCK' },
                { id: 'IPO', label: 'IPO' },
              ]}
              value={selectedType}
              onChange={(t) => setValue('type', t)}
            />
          </View>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Investment name" icon="briefcase-outline" placeholder="e.g. Tata Motors" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="symbol"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Ticker / symbol" icon="pricetag-outline" placeholder="e.g. TATAMOTORS" autoCapitalize="characters" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.symbol?.message} />
            )}
          />
          <Controller
            control={control}
            name="exchange"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Exchange (optional)" icon="globe-outline" placeholder="NSE / BSE / NASDAQ" autoCapitalize="characters" onBlur={onBlur} onChangeText={onChange} value={value} />
            )}
          />
          <Controller
            control={control}
            name="broker"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Broker (optional)" icon="business-outline" placeholder="Zerodha / Groww" onBlur={onBlur} onChangeText={onChange} value={value} />
            )}
          />

          <Button title="Create investment" icon="checkmark" onPress={handleSubmit(onSubmit)} isLoading={isSubmitting || createMutation.isPending} />
        </GlassCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.infoSoft, padding: 12, borderRadius: 14, marginBottom: 14 },
  noteText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.info, lineHeight: 18 },
  label: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.ink2, marginBottom: 8, letterSpacing: 0.3 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.lossSoft, padding: 12, borderRadius: 14, marginBottom: 14 },
  errorText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.loss },
});
