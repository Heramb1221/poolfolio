import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCreateGroup } from '../../../src/hooks/useGroups';
import { Screen } from '../../../src/components/layout/Screen';
import { ScreenHeader } from '../../../src/components/layout/ScreenHeader';
import { GlassCard } from '../../../src/components/ui/GlassCard';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { useToast } from '../../../src/components/feedback/Toast';
import { colors, fonts, shadow } from '../../../src/theme/tokens';
import { enter } from '../../../src/theme/motion';

const createGroupSchema = z.object({
  name: z.string().trim().min(3, 'Group name must be at least 3 characters'),
});
type CreateGroupFormData = z.infer<typeof createGroupSchema>;

export default function CreateGroupScreen() {
  const router = useRouter();
  const toast = useToast();
  const createGroupMutation = useCreateGroup();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: CreateGroupFormData) => {
    setErrorMsg(null);
    try {
      const res = await createGroupMutation.mutateAsync(data);
      toast.success('Group created', `"${res.group.name}" is ready for members.`);
      router.back();
    } catch (err: any) {
      const msg = err?.message || 'Failed to create group';
      setErrorMsg(msg);
      toast.error('Could not create group', msg);
    }
  };

  return (
    <Screen header={<ScreenHeader title="New group" modal />}>
      <Animated.View entering={enter(0)} style={{ alignItems: 'center', marginVertical: 18 }}>
        <View style={shadow.glow}>
          <LinearGradient colors={['#064E3B', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
            <Ionicons name="people" size={34} color={colors.white} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Create investment group</Text>
        <Text style={styles.sub}>You will be assigned as the group LEADER.</Text>
      </Animated.View>

      <Animated.View entering={enter(1)}>
        <GlassCard>
          {errorMsg ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
              <Ionicons name="alert-circle" size={17} color={colors.loss} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </Animated.View>
          ) : null}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Group name"
                icon="pricetag-outline"
                placeholder="e.g. Friends Tech Portfolio"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message}
              />
            )}
          />
          <Button
            title="Create group"
            icon="checkmark"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting || createGroupMutation.isPending}
          />
        </GlassCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.sansBold, fontSize: 22, color: colors.ink, marginTop: 16, letterSpacing: -0.4 },
  sub: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.ink2, marginTop: 4 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.lossSoft, padding: 12, borderRadius: 14, marginBottom: 14 },
  errorText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.loss },
});
