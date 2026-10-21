import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { getGroupDetails } from '@/db/queries';
import { GroupRecord, MemberRecord, RoundRecord, PaymentRecord } from '@/db/schema';
import { MiniRing } from '@/components/ring/MiniRing';

export default function GroupRoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    group: GroupRecord;
    members: MemberRecord[];
    rounds: RoundRecord[];
    currentRound: RoundRecord | null;
    payments: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number })[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    (async () => {
      try {
        const result = await getGroupDetails(id);
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setData(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading || !data) {
    return (
      <ResponsiveContainer>
        <View style={styles.centerBox}>
          <Text style={{ color: colors.muted, fontFamily: typography.bodyFont }}>
            Loading group records...
          </Text>
        </View>
      </ResponsiveContainer>
    );
  }

  const { group, members, currentRound, payments } = data;
  const currentCollector = members.find(
    (m) => m.id === currentRound?.collector_member_id
  );

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Top Navigation */}
        <View style={[styles.headerRow, { marginVertical: spacing.lg }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text
              style={[
                styles.backText,
                { color: colors.accent, fontFamily: typography.bodyMediumFont },
              ]}>
              ← Groups
            </Text>
          </Pressable>
        </View>

        {/* Group Header Card */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.base,
              marginBottom: spacing.lg,
            },
          ]}>
          <View style={styles.topInfoRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.groupTitle,
                  { color: colors.ink, fontFamily: typography.headingFont },
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
              size={56}
              highlightIndex={currentCollector ? currentCollector.turn_order - 1 : 0}
            />
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.line, marginVertical: spacing.md },
            ]}
          />

          <View style={styles.collectorBanner}>
            <Text
              style={[
                styles.collectorLabel,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              Collector this round:
            </Text>
            <Text
              style={[
                styles.collectorName,
                { color: colors.accent, fontFamily: typography.headingSemiBoldFont },
              ]}>
              {currentCollector?.name || 'Assigned'}
            </Text>
          </View>
        </View>

        {/* Members Status List */}
        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            Round {group.current_round} Contributions ({payments.length})
          </Text>

          {payments.map((p) => {
            const isCollector = p.member_id === currentRound?.collector_member_id;
            const isPaid = p.status === 'paid';

            return (
              <View
                key={p.id}
                style={[
                  styles.paymentRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderWidth: isDark ? 1 : 0,
                    borderRadius: radii.card,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}>
                <View
                  style={[
                    styles.memberDot,
                    {
                      backgroundColor: isCollector
                        ? colors.accent
                        : isPaid
                        ? colors.paid
                        : colors.bg,
                      borderRadius: radii.pill,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.turnText,
                      { color: isPaid || isCollector ? '#FFFFFF' : colors.ink },
                    ]}>
                    #{p.turn_order}
                  </Text>
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text
                    style={[
                      styles.memberName,
                      { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                    ]}>
                    {p.member_name} {isCollector ? '(Collector)' : ''}
                  </Text>
                  <Text
                    style={[
                      styles.memberStatus,
                      {
                        color: isPaid ? colors.paid : colors.unpaid,
                        fontFamily: typography.bodyFont,
                      },
                    ]}>
                    {isPaid ? 'Paid' : `Due: ${formatNaira(p.target_amount)}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerRow: {
    marginBottom: 8,
  },
  backButton: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 15,
  },
  summaryCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 24,
    letterSpacing: -0.4,
  },
  groupMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  collectorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collectorLabel: {
    fontSize: 14,
  },
  collectorName: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberDot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 15,
  },
  memberStatus: {
    fontSize: 13,
    marginTop: 2,
  },
});
