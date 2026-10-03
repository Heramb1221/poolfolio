import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#38bdf8',
        headerTitleStyle: { fontWeight: 'bold', color: '#ffffff' },
        contentStyle: { backgroundColor: '#090d16' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="groups/[groupId]"
        options={{ title: 'Group Details' }}
      />
      <Stack.Screen
        name="groups/create"
        options={{ title: 'Create Group', presentation: 'modal' }}
      />
      <Stack.Screen
        name="investments/[investmentId]"
        options={{ title: 'Investment Details' }}
      />
      <Stack.Screen
        name="investments/create"
        options={{ title: 'Create Investment', presentation: 'modal' }}
      />
    </Stack>
  );
}
