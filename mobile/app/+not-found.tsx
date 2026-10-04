import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/layout/Screen';
import { EmptyState } from '../src/components/ui/EmptyState';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="compass-outline"
          title="This screen doesn't exist"
          message="The link may be broken or the page has moved."
          actionLabel="Go to portfolio"
          actionIcon="home-outline"
          onAction={() => router.replace('/')}
        />
      </View>
    </Screen>
  );
}
