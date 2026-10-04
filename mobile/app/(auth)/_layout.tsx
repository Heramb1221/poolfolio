import React from 'react';
import { View } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { LoadingBlock } from '../../src/components/ui/Spinner';
import { colors } from '../../src/theme/tokens';

export default function AuthLayout() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <LoadingBlock />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
