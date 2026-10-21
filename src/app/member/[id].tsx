import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { Button } from '@/components/ui/button';
import { getMemberReliabilityProfile, MemberProfileData } from '@/db/queries';
import { sendWhatsAppOrShare } from '@/utils/whatsapp';

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MemberProfileData | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      try {
        const result = await getMemberReliabilityProfile(id);
        if (isMounted) setData(result);
      } catch {
        if (isMounted) setData(null);
      } finally {
        if (isMounted) setLoading(false);
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
            Loading member record...
          </Text>
        </View>
      </ResponsiveContainer>
    );
  }

  const { member, groupName, totalContributions, onTimeCount, lateCount, unpaidCount, reliabilityScore, paymentsHistory, swaps } = data;

  let scoreColor = colors.paid;
  let scoreBadge = 'Excellent (Prompt Pay)';
  if (reliabilityScore < 60) {
    scoreColor = colors.unpaid;
    scoreBadge = 'High Risk (Frequently Late)';
  } else if (reliabilityScore < 85) {
    scoreColor = '#E07A5F';
    scoreBadge = 'Fair (Occasional Delays)';
  }

  const handleMessageMember = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendWhatsAppOrShare(member.phone, `Hello ${member.name}, reaching out from ${groupName}.`);
  };

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Navigation Bar */}
        <View style={[styles.navBar, { marginVertical: spacing.md }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Text
              style={[
                styles.backText,
                { color: colors.accentText, fontFamily: typography.bodySemiBoldFont },
              ]}>
              ← Back
            </Text>
          </Pressable>
        </View>

        {/* Member Header Card */}
        <View
          style={[
            styles.headerCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.base,
              marginBottom: spacing.base,
            },
          ]}>
          <View style={styles.avatarRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: colors.accent, borderRadius: radii.pill },
              ]}>
              <Text
                style={[
                  styles.avatarInitial,
                  { color: '#0A1C16', fontFamily: typography.headingFont },
                ]}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text
                style={[
                  styles.memberName,
                  { color: colors.ink, fontFamily: typography.headingFont },
                ]}>
                {member.name}
              </Text>
              <Text
                style={[
                  styles.memberPhone,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                {member.formatted_phone}
              </Text>
              <Text
                style={[
                  styles.memberGroup,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                {groupName} • Turn #{member.turn_order}
              </Text>
            </View>
          </View>

          {member.note && (
            <View
              style={[
                styles.noteBox,
                {
                  backgroundColor: colors.bg,
                  borderRadius: radii.card,
                  borderColor: colors.line,
                  borderWidth: 1,
                  padding: spacing.sm,
                  marginTop: spacing.md,
                },
              ]}>
              <Text
                style={[
                  styles.noteText,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Organizer Note: {member.note}
              </Text>
            </View>
          )}

          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Message Member on WhatsApp"
              variant="secondary"
              onPress={handleMessageMember}
              style={{ width: '100%' }}
            />
          </View>
        </View>

        {/* Reliability Score Card */}
        <View
          style={[
            styles.scoreCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.base,
              marginBottom: spacing.base,
            },
          ]}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.muted, fontFamily: typography.bodyMediumFont },
            ]}>
            RELIABILITY RECORD (ORGANIZER ONLY)
          </Text>

          <View style={[styles.scoreHeaderRow, { marginVertical: spacing.sm }]}>
            <View>
              <Text
                style={[
                  styles.scorePercent,
                  { color: scoreColor, fontFamily: typography.headingFont },
                ]}>
                {reliabilityScore}%
              </Text>
              <Text
                style={[
                  styles.scoreBadgeText,
                  { color: scoreColor, fontFamily: typography.headingSemiBoldFont },
                ]}>
                {scoreBadge}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.totalContributedLabel,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Total Contributed
              </Text>
              <Text
                style={[
                  styles.totalContributedAmount,
                  { color: colors.accent, fontFamily: typography.headingFont },
                ]}>
                {formatNaira(totalContributions)}
              </Text>
            </View>
          </View>

          {/* Breakdown Pills */}
          <View style={styles.statsPillRow}>
            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.bg, borderColor: colors.line, borderRadius: radii.card },
              ]}>
              <Text
                style={[
                  styles.statPillNum,
                  { color: colors.paid, fontFamily: typography.headingFont },
                ]}>
                {onTimeCount}
              </Text>
              <Text
                style={[
                  styles.statPillLabel,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                On Time
              </Text>
            </View>

            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.bg, borderColor: colors.line, borderRadius: radii.card, marginHorizontal: spacing.xs },
              ]}>
              <Text
                style={[
                  styles.statPillNum,
                  { color: '#E07A5F', fontFamily: typography.headingFont },
                ]}>
                {lateCount}
              </Text>
              <Text
                style={[
                  styles.statPillLabel,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Delayed
              </Text>
            </View>

            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.bg, borderColor: colors.line, borderRadius: radii.card },
              ]}>
              <Text
                style={[
                  styles.statPillNum,
                  { color: colors.unpaid, fontFamily: typography.headingFont },
                ]}>
                {unpaidCount}
              </Text>
              <Text
                style={[
                  styles.statPillLabel,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Pending
              </Text>
            </View>
          </View>
        </View>

        {/* Turn Swaps History (if any) */}
        {swaps.length > 0 && (
          <View
            style={[
              styles.swapsCard,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.base,
                marginBottom: spacing.base,
              },
            ]}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
              ]}>
              TURN SWAPS LOG ({swaps.length})
            </Text>

            {swaps.map((s) => (
              <View
                key={s.id}
                style={[
                  styles.swapItem,
                  { borderColor: colors.line, borderBottomWidth: 1, paddingVertical: spacing.sm },
                ]}>
                <Text
                  style={[
                    styles.swapItemTitle,
                    { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                  ]}>
                  Swapped Round #{s.roundA} with {s.partnerName} (Round #{s.roundB})
                </Text>
                <Text
                  style={[
                    styles.swapReason,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  Reason: {s.reason}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Payments History Timeline */}
        <View style={{ marginTop: spacing.sm }}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
            ]}>
            CONTRIBUTIONS HISTORY ({paymentsHistory.length})
          </Text>

          {paymentsHistory.map((p) => {
            const isPaid = p.status === 'paid';
            const isPartPaid = p.status === 'part_paid';

            return (
              <View
                key={p.id}
                style={[
                  styles.historyCard,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.card,
                    borderColor: colors.line,
                    borderWidth: isDark ? 1 : 0,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}>
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.historyRound,
                        { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
                      ]}>
                      Round #{p.roundNumber}
                    </Text>
                    <Text
                      style={[
                        styles.historyDate,
                        { color: colors.muted, fontFamily: typography.bodyFont },
                      ]}>
                      {isPaid && p.paidAt
                        ? `Paid on ${new Date(p.paidAt).toLocaleDateString()}`
                        : `Due on ${new Date(p.dueDate).toLocaleDateString()}`}
                    </Text>
                    {p.note && (
                      <Text
                        style={[
                          styles.historyNote,
                          { color: colors.muted, fontFamily: typography.bodyFont },
                        ]}>
                        Note: {p.note}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.historyAmount,
                        {
                          color: isPaid ? colors.paid : isPartPaid ? '#E07A5F' : colors.ink,
                          fontFamily: typography.headingSemiBoldFont,
                        },
                      ]}>
                      {formatNaira(p.amount > 0 ? p.amount : p.targetAmount)}
                    </Text>
                    <Text
                      style={[
                        styles.historyStatus,
                        {
                          color: isPaid ? colors.paid : isPartPaid ? '#E07A5F' : colors.unpaid,
                          fontFamily: typography.bodyMediumFont,
                        },
                      ]}>
                      {isPaid ? 'Paid' : isPartPaid ? 'Part Paid' : 'Unpaid'}
                    </Text>
                  </View>
                </View>

                {p.receiptUri && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Image source={{ uri: p.receiptUri }} style={styles.receiptPreview} />
                  </View>
                )}
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
  navBar: {
    flexDirection: 'row',
  },
  backBtn: {
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
  },
  headerCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
  },
  memberName: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  memberPhone: {
    fontSize: 14,
    marginTop: 1,
  },
  memberGroup: {
    fontSize: 13,
    marginTop: 2,
  },
  noteBox: {
    width: '100%',
  },
  noteText: {
    fontSize: 12,
  },
  scoreCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scorePercent: {
    fontSize: 34,
    letterSpacing: -1,
  },
  scoreBadgeText: {
    fontSize: 13,
    marginTop: 2,
  },
  totalContributedLabel: {
    fontSize: 12,
  },
  totalContributedAmount: {
    fontSize: 22,
    marginTop: 2,
  },
  statsPillRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statPillNum: {
    fontSize: 18,
  },
  statPillLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  swapsCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  swapItem: {
    width: '100%',
  },
  swapItemTitle: {
    fontSize: 13,
  },
  swapReason: {
    fontSize: 12,
    marginTop: 2,
  },
  historyCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyRound: {
    fontSize: 15,
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyNote: {
    fontSize: 12,
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 16,
  },
  historyStatus: {
    fontSize: 12,
    marginTop: 1,
  },
  receiptPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
});
