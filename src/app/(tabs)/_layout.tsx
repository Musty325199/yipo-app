import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { RingIcon, CalendarIcon, SettingsIcon } from '@/components/ui/icons';

export default function TabsLayout() {
  const { colors, typography, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          elevation: isDark ? 0 : 4,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0 : 0.04,
          shadowRadius: 8,
          height: Platform.select({ ios: 88, android: 68, default: 68 }),
          paddingBottom: Platform.select({ ios: 28, android: 10, default: 10 }),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: typography.bodyMediumFont,
          fontSize: 12,
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <RingIcon size={size || 22} color={color ? String(color) : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <CalendarIcon size={size || 22} color={color ? String(color) : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon size={size || 22} color={color ? String(color) : undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
