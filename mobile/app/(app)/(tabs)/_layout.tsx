import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTitleStyle: { color: '#ffffff', fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '600' }}>
              Dashboard
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '600' }}>
              Groups
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12, fontWeight: '600' }}>
              Profile
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
