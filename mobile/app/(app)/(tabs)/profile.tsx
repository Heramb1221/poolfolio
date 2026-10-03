import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { Card } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background px-4 py-6">
      <Card className="items-center py-6 mb-6">
        <View className="w-16 h-16 rounded-full bg-slate-800 items-center justify-center border border-primary mb-3">
          <Text className="text-primary text-2xl font-bold">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </Text>
        </View>
        <Text className="text-white text-xl font-bold">{user?.name}</Text>
        <Text className="text-slate-400 text-sm mt-1">{user?.email}</Text>
      </Card>

      <Card>
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
          Account Information
        </Text>
        <View className="py-2 border-b border-border flex-row justify-between">
          <Text className="text-slate-400 text-sm">User ID</Text>
          <Text className="text-white text-xs font-mono">{user?.id}</Text>
        </View>
        <View className="py-2 flex-row justify-between">
          <Text className="text-slate-400 text-sm">Member Since</Text>
          <Text className="text-white text-sm">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </Card>

      <Button
        title="Sign Out"
        variant="danger"
        onPress={handleLogout}
        isLoading={isLoading}
        className="mt-4"
      />
    </ScrollView>
  );
}
