import 'react-native-gesture-handler';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/components/feedback/Toast';
import { ConfirmProvider } from '../src/components/feedback/ConfirmProvider';
import { colors } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 20 * 1000,
    },
  },
});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const onReady = useCallback(() => {
    if (loaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, fontError]);

  if (!loaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>
                <View style={{ flex: 1 }} onLayout={onReady}>
                  <StatusBar style="dark" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: 'fade',
                      contentStyle: { backgroundColor: colors.bg },
                    }}
                  >
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                </View>
              </ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
