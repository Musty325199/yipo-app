import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { CalendarIcon } from '@/components/ui/icons';
import { getCalendarSchedule, CalendarRoundItem } from '@/db/queries';
import { formatLagosDate } from '@/utils/dates';

export default function CalendarScreen() {
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  const [items, setItems] = useState<CalendarRoundItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    try {
      const schedule = await getCalendarSchedule();
      setItems(schedule);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [fetchSchedule])
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const dueTodayOrOverdue = items.filter(
    (item) => item.status === 'open' && item.dueDate.split('T')[0] <= todayStr
  );

  const upcoming = items.filter(
    (item) => item.status === 'open' && item.dueDate.split('T')[0] > todayStr
  );

  const completed = items.filter((item) => item.status === 'completed');

  const handleOpenRound = (groupId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/group/${groupId}`);
  };

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Screen Header */}
        <View style={[styles.header, { marginVertical: spacing.lg }]}>
          <Text
            style={[
              styles.screenTitle,
              { color: colors.ink, fontFamily: typography.headingFont },
            ]}>
            Ajo Calendar
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            Timeline of upcoming payouts and contribution deadlines
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <Text style={{ color: colors.muted, fontFamily: typography.bodyFont }}>
              Loading schedule...
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.xl,
              },
            ]}>
            <View style={[styles.iconWrapper, { marginBottom: spacing.base }]}>
              <CalendarIcon size={44} color={colors.accentText} strokeWidth={1.8} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
              ]}>
              No active schedules
            </Text>
            <Text
              style={[
                styles.emptyDesc,
                { color: colors.muted, fontFamily: typography.bodyFont, marginTop: spacing.xs },
              ]}>
              Create an Ajo group to automatically generate collection due dates and round schedules.
            </Text>
          </View>
        ) : (
          <>
            {/* Due Today / Overdue Section */}
            {dueTodayOrOverdue.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: colors.unpaid, fontFamily: typography.headingSemiBoldFont, marginBottom: spacing.sm },
                  ]}>
                  ⚠️ ACTION REQUIRED ({dueTodayOrOverdue.length})
                </Text>

                {dueTodayOrOverdue.map((item) => (
                  <Pressable
                    key={item.roundId}
                    onPress={() => handleOpenRound(item.groupId)}
                    style={({ pressed }) => [
                      styles.scheduleCard,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: radii.card,
                        borderColor: colors.unpaid,
                        borderWidth: 1.5,
                        padding: spacing.base,
                        marginBottom: spacing.sm,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.cardGroupName,
                            { color: colors.ink, fontFamily: typography.headingFont },
                          ]}>
                          {item.groupName}
                        </Text>
                        <Text
                          style={[
                            styles.cardMeta,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          Round {item.roundNumber} of {item.totalRounds} • Collector: {item.collectorName}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.cardAmount,
                            { color: colors.accent, fontFamily: typography.headingFont },
                          ]}>
                          {formatNaira(item.targetAmount)}
                        </Text>
                        <Text
                          style={[
                            styles.dueDateBadge,
                            { color: colors.unpaid, fontFamily: typography.bodyMediumFont },
                          ]}>
                          Due: {formatLagosDate(item.dueDate)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Upcoming Rounds Section */}
            {upcoming.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
                  ]}>
                  UPCOMING ROUNDS ({upcoming.length})
                </Text>

                {upcoming.map((item) => (
                  <Pressable
                    key={item.roundId}
                    onPress={() => handleOpenRound(item.groupId)}
                    style={({ pressed }) => [
                      styles.scheduleCard,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: radii.card,
                        borderColor: colors.line,
                        borderWidth: isDark ? 1 : 0,
                        padding: spacing.base,
                        marginBottom: spacing.sm,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.cardGroupName,
                            { color: colors.ink, fontFamily: typography.headingFont },
                          ]}>
                          {item.groupName}
                        </Text>
                        <Text
                          style={[
                            styles.cardMeta,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          Round {item.roundNumber} of {item.totalRounds} • Collector: {item.collectorName}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.cardAmount,
                            { color: colors.accent, fontFamily: typography.headingFont },
                          ]}>
                          {formatNaira(item.targetAmount)}
                        </Text>
                        <Text
                          style={[
                            styles.dueDateBadge,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          {formatLagosDate(item.dueDate)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Completed Rounds Section */}
            {completed.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
                  ]}>
                  COMPLETED ROUNDS ({completed.length})
                </Text>

                {completed.map((item) => (
                  <Pressable
                    key={item.roundId}
                    onPress={() => handleOpenRound(item.groupId)}
                    style={({ pressed }) => [
                      styles.scheduleCard,
                      {
                        backgroundColor: colors.surface,
                        borderRadius: radii.card,
                        borderColor: colors.line,
                        borderWidth: isDark ? 1 : 0,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                        opacity: 0.85,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.cardGroupName,
                            { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                          ]}>
                          {item.groupName} — Round {item.roundNumber}
                        </Text>
                        <Text
                          style={[
                            styles.cardMeta,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          Collector: {item.collectorName}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.completedTag,
                            { color: colors.paid, fontFamily: typography.headingSemiBoldFont },
                          ]}>
                          ✓ {formatNaira(item.targetAmount)} Handed Over
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(240, 180, 41, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  sectionHeader: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  scheduleCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardGroupName: {
    fontSize: 17,
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 17,
  },
  dueDateBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  completedTag: {
    fontSize: 13,
  },
});
