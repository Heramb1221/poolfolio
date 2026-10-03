import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateGroup } from '../../../src/hooks/useGroups';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';

const createGroupSchema = z.object({
  name: z.string().trim().min(3, 'Group name must be at least 3 characters'),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

export default function CreateGroupScreen() {
  const router = useRouter();
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
      Alert.alert('Success', `Group "${res.group.name}" created!`);
      router.back();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-4 py-6">
      <Text className="text-white text-xl font-bold mb-2">Create Investment Group</Text>
      <Text className="text-slate-400 text-sm mb-6">
        As the creator, you will be assigned as the group LEADER.
      </Text>

      {errorMsg && (
        <View className="bg-red-950/60 border border-red-800 p-3.5 rounded-xl mb-4">
          <Text className="text-red-300 text-sm">{errorMsg}</Text>
        </View>
      )}

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Group Name"
            placeholder="e.g. Friends Tech Portfolio"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={errors.name?.message}
          />
        )}
      />

      <Button
        title="Create Group"
        onPress={handleSubmit(onSubmit)}
        isLoading={isSubmitting || createGroupMutation.isPending}
        className="mt-4"
      />
    </ScrollView>
  );
}
