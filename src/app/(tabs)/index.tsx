import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { MiniRing } from '@/components/ring/MiniRing';
import { Button } from '@/components/ui/button';
import { CommunityBanner } from '@/components/ui/CommunityBanner';
import { getGroupsSummary, GroupSummary } from '@/db/queries';
import { PlusBadge, isPlusUnlocked } from '@/utils/plus';

export default function GroupsHomeScreen() {
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    try {
      const data = await getGroupsSummary();
      setGroups(data);
    } catch {
      // If error or uninitialized, empty state
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const handleNewGroupPress = async () => {
    const isPlus = await isPlusUnlocked();
    if (!isPlus && groups.length >= 2) {
      Alert.alert(
        'Group Limit Reached',
        'Standard plan includes up to 2 active groups. Yípo Plus includes unlimited groups.'
      );
      return;
    }
    router.push('/group/new');
  };

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={[styles.headerRow, { marginVertical: spacing.lg }]}>
          <View>
            <Text
              style={[
                styles.appTitle,
                { color: colors.ink, fontFamily: typography.headingFont },
              ]}>
              Yípo
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              Savings groups
            </Text>
          </View>

          <Button
            label="+ New group"
            onPress={handleNewGroupPress}
            style={{ minHeight: 44, paddingVertical: spacing.sm, paddingHorizontal: spacing.base }}
          />
        </View>

        {/* Community & Broadcast Banner */}
        <CommunityBanner />

        {/* Empty State (when no groups exist) */}
        {!loading && groups.length === 0 && (
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
            <View style={[styles.miniRingWrapper, { marginBottom: spacing.base }]}>
              <MiniRing size={88} highlightIndex={1} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
              ]}>
              No groups yet
            </Text>
            <Text
              style={[
                styles.emptyBody,
                { color: colors.muted, fontFamily: typography.bodyFont, marginBottom: spacing.lg },
              ]}>
              No group yet. Add your first ajo and the ring will appear here.
            </Text>
            <Button
              label="Start your first group"
              onPress={() => router.push('/group/new')}
            />
          </View>
        )}

        {/* Groups List */}
        {groups.length > 0 && (
          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.muted, fontFamily: typography.bodyMediumFont },
                ]}>
                Active groups ({groups.length})
              </Text>

              <Pressable
                onPress={() => router.push('/reminders')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 5,
                  backgroundColor: colors.surface,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}>
                <Text
                  style={{
                    color: colors.ink,
                    fontFamily: typography.bodySemiBoldFont,
                    fontSize: 12,
                  }}>
                  Bulk Reminders
                </Text>
                <PlusBadge />
              </Pressable>
            </View>

            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => router.push(`/group/${group.id}`)}
                style={[
                  styles.groupCard,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.card,
                    borderColor: colors.line,
                    borderWidth: isDark ? 1 : 0,
                    padding: spacing.base,
                    marginBottom: spacing.base,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0 : 0.06,
                    shadowRadius: 10,
                    elevation: isDark ? 0 : 2,
                  },
                ]}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardInfo}>
                    <Text
                      style={[
                        styles.groupName,
                        { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
                      ]}>
                      {group.name}
                    </Text>
                    <Text
                      style={[
                        styles.groupMeta,
                        { color: colors.muted, fontFamily: typography.bodyFont },
                      ]}>
                      {formatNaira(group.contribution_amount)} / {group.frequency} • Round{' '}
                      {group.current_round} of {group.total_rounds}
                    </Text>
                  </View>
                  <MiniRing
                    size={52}
                    highlightIndex={group.next_collector_index}
                  />
                </View>

                <View
                  style={[
                    styles.cardDivider,
                    { backgroundColor: colors.line, marginVertical: spacing.md },
                  ]}
                />

                <View style={styles.cardFooter}>
                  <View>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.muted, fontFamily: typography.bodyFont },
                      ]}>
                      Next collector
                    </Text>
                    <Text
                      style={[
                        styles.statValue,
                        { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                      ]}>
                      {group.next_collector_name}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.statLabel,
                        { color: colors.muted, fontFamily: typography.bodyFont },
                      ]}>
                      Outstanding
                    </Text>
                    <Text
                      style={[
                        styles.amountText,
                        {
                          color: group.outstanding_amount > 0 ? colors.unpaid : colors.paid,
                          fontFamily: typography.headingSemiBoldFont,
                        },
                      ]}>
                      {formatNaira(group.outstanding_amount)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    textAlign: 'center',
  },
  miniRingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 290,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  groupCard: {
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupName: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  groupMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    width: '100%',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
  },
  amountText: {
    fontSize: 16,
  },
});
