import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { CalendarIcon } from '@/components/ui/icons';

export default function CalendarScreen() {
  const { colors, typography, spacing, radii, isDark } = useTheme();

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { marginVertical: spacing.lg }]}>
          <Text
            style={[
              styles.screenTitle,
              { color: colors.ink, fontFamily: typography.headingFont },
            ]}>
            Calendar
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            Upcoming due dates and collection rounds
          </Text>
        </View>

        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.xl,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0 : 0.05,
              shadowRadius: 12,
              elevation: isDark ? 0 : 2,
            },
          ]}>
          <View style={[styles.iconWrapper, { marginBottom: spacing.base }]}>
            <CalendarIcon size={44} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
            ]}>
            No upcoming dates
          </Text>
          <Text
            style={[
              styles.emptyBody,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            Upcoming round dates will show here once you add a group.
          </Text>
        </View>
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 20,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 19,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 290,
  },
});
