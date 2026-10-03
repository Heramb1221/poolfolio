import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateInvestment } from '../../../src/hooks/useInvestments';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { InvestmentType } from '../../../src/types/api';

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
    defaultValues: {
      name: '',
      symbol: '',
      type: 'STOCK',
      exchange: '',
      broker: '',
    },
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
      Alert.alert('Success', 'Investment created in DRAFT status.');
      router.back();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create investment');
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-4 py-6">
      <Text className="text-white text-xl font-bold mb-1">New Investment</Text>
      <Text className="text-slate-400 text-xs mb-6">
        Starts in DRAFT status. Move to OPEN when you are ready to collect member contributions.
      </Text>

      {errorMsg && (
        <View className="bg-red-950/60 border border-red-800 p-3.5 rounded-xl mb-4">
          <Text className="text-red-300 text-sm">{errorMsg}</Text>
        </View>
      )}

      {/* Type Toggle */}
      <Text className="text-slate-300 text-sm font-medium mb-2">Investment Type</Text>
      <View className="flex-row gap-3 mb-4">
        {(['STOCK', 'IPO'] as InvestmentType[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setValue('type', t)}
            className={`flex-1 py-3 rounded-xl border items-center ${
              selectedType === t
                ? 'bg-primary/20 border-primary'
                : 'bg-surface border-border'
            }`}
          >
            <Text
              className={`font-semibold ${
                selectedType === t ? 'text-primary' : 'text-slate-400'
              }`}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Investment Name"
            placeholder="e.g. Tata Motors"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="symbol"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Ticker / Symbol"
            placeholder="e.g. TATAMOTORS"
            autoCapitalize="characters"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.symbol?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="exchange"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Exchange (Optional)"
            placeholder="e.g. NSE / BSE / NASDAQ"
            autoCapitalize="characters"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />

      <Controller
        control={control}
        name="broker"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Broker (Optional)"
            placeholder="e.g. Zerodha / Groww"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
          />
        )}
      />

      <Button
        title="Create Investment"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting || createMutation.isPending}
        className="mt-4"
      />
    </ScrollView>
  );
}
