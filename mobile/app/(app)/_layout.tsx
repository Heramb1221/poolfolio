import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { LoadingBlock } from '../../src/components/ui/Spinner';
import { colors } from '../../src/theme/tokens';
import { View } from 'react-native';

export default function AppLayout() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <LoadingBlock label="Loading your portfolio…" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="groups/[groupId]" />
      <Stack.Screen name="groups/create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="investments/[investmentId]" />
      <Stack.Screen name="investments/create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
