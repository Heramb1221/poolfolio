import React from 'react';
import { View, Text } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Text className="text-white text-xl font-bold mb-2">
          This screen doesn't exist.
        </Text>
        <Link href="/" className="mt-4">
          <Text className="text-primary text-base font-semibold">
            Go to home screen
          </Text>
        </Link>
      </View>
    </>
  );
}
