import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { Button } from '@/components/ui/button';
import {
  getGroupDetails,
  recordPayment,
  advanceToNextRound,
  deleteGroup,
  updateMemberPhone,
} from '@/db/queries';
import { normalizeNigerianPhone, formatPhoneForDisplay } from '@/utils/phone';
import { GroupRecord, MemberRecord, RoundRecord, PaymentRecord } from '@/db/schema';
import { RoundRing } from '@/components/ring/RoundRing';
import { PaymentBottomSheet } from '@/components/sheets/PaymentBottomSheet';
import { WhatsAppReminderModal } from '@/components/sheets/WhatsAppReminderModal';
import { SwapTurnsModal } from '@/components/sheets/SwapTurnsModal';
import {
  buildReceiptMessage,
  buildGroupSummaryMessage,
  sendWhatsAppOrShare,
} from '@/utils/whatsapp';
import { scheduleRoundNotification } from '@/utils/notifications';
import { exportStatementPdf } from '@/utils/pdf';
import { PlusBadge } from '@/utils/plus';

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

  // Bottom Sheet Selection
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<
    (PaymentRecord & { member_name: string; member_phone: string; turn_order: number }) | null
  >(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Round Advance Confirmation Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // WhatsApp Tone Selector Modal for Reminders
  const [reminderModalMember, setReminderModalMember] = useState<{
    member: MemberRecord;
    amountDue: string;
  } | null>(null);

  // Turn Swapping Modal
  const [showSwapModal, setShowSwapModal] = useState(false);

  // One-tap Payment & Undo Toast
  const markingPaidRef = useRef<Set<string>>(new Set());
  const [undoToast, setUndoToast] = useState<{
    paymentId: string;
    prevAmount: number;
    prevStatus: 'unpaid' | 'part_paid' | 'paid';
    memberName: string;
  } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Missing phone number prompt for WhatsApp
  const [phonePromptMember, setPhonePromptMember] = useState<{
    member: MemberRecord;
    payment: PaymentRecord;
  } | null>(null);
  const [promptPhoneInput, setPromptPhoneInput] = useState('');
  const [promptPhoneError, setPromptPhoneError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const result = await getGroupDetails(id);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      try {
        const result = await getGroupDetails(id);
        if (isMounted) {
          setData(result);
          if (result && result.currentRound && result.group.status === 'active') {
            const collector = result.members.find(
              (m) => m.id === result.currentRound?.collector_member_id
            );
            scheduleRoundNotification({
              groupId: result.group.id,
              groupName: result.group.name,
              roundNumber: result.group.current_round,
              dueDateISO: result.currentRound.due_date,
              collectorName: collector?.name || 'Collector',
            }).catch(() => {});
          }
        }
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

  const handleSelectMember = (member: MemberRecord) => {
    if (!data) return;
    const payment = data.payments.find((p) => p.member_id === member.id) || null;
    setSelectedMember(member);
    setSelectedPayment(payment);
    setSheetVisible(true);
  };

  const handleSavePayment = async (input: {
    paymentId: string;
    amount: number;
    status: 'unpaid' | 'part_paid' | 'paid';
    receiptImageUri?: string | null;
    note?: string | null;
    lateFeeAmount?: number;
    lateFeeWaived?: boolean;
    lateFeeWaivedReason?: string | null;
  }) => {
    await recordPayment(input);
    await loadData();
  };

  const handleConfirmAdvanceRound = async () => {
    if (!data) return;
    setAdvancing(true);
    try {
      const res = await advanceToNextRound(data.group.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdvanceModal(false);
      await loadData();

      if (res.isCompleted) {
        Alert.alert(
          'Cycle Completed!',
          `All ${data.group.total_rounds} rounds of "${data.group.name}" are successfully completed!`
        );
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to advance round');
    } finally {
      setAdvancing(false);
    }
  };

  const handleDeleteGroup = () => {
    if (!data) return;
    Alert.alert(
      'Delete Group?',
      `Are you sure you want to permanently delete "${data.group.name}" and all records? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteGroup(data.group.id);
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleQuickOneTapPaid = async (
    payment: PaymentRecord,
    member: MemberRecord
  ) => {
    if (markingPaidRef.current.has(payment.id)) return;
    markingPaidRef.current.add(payment.id);

    try {
      if (payment.status === 'paid') {
        handleSelectMember(member);
        return;
      }

      const prevAmount = payment.amount;
      const prevStatus = payment.status;

      await recordPayment({
        paymentId: payment.id,
        amount: payment.target_amount,
        status: 'paid',
        receiptImageUri: payment.receipt_image_uri,
        note: payment.note,
        lateFeeAmount: payment.late_fee_amount,
        lateFeeWaived: Boolean(payment.late_fee_waived),
        lateFeeWaivedReason: payment.late_fee_waived_reason,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();

      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      setUndoToast({
        paymentId: payment.id,
        prevAmount,
        prevStatus,
        memberName: member.name,
      });

      undoTimeoutRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 4000);
    } catch {
      Alert.alert('Error', 'Failed to update payment status.');
    } finally {
      setTimeout(() => {
        markingPaidRef.current.delete(payment.id);
      }, 400);
    }
  };

  const handleUndoPayment = async () => {
    if (!undoToast) return;
    const { paymentId, prevAmount, prevStatus } = undoToast;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast(null);

    try {
      await recordPayment({
        paymentId,
        amount: prevAmount,
        status: prevStatus,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to undo payment.');
    }
  };

  const handleSavePhoneAndOpenWhatsApp = async () => {
    if (!phonePromptMember) return;
    const normalized = normalizeNigerianPhone(promptPhoneInput.trim());
    if (!normalized) {
      setPromptPhoneError('Enter a valid Nigerian phone number (e.g. 0803 123 4567).');
      return;
    }

    const formatted = formatPhoneForDisplay(normalized);
    await updateMemberPhone(phonePromptMember.member.id, normalized, formatted);
    const updatedMember: MemberRecord = {
      ...phonePromptMember.member,
      phone: normalized,
      formatted_phone: formatted,
    };
    const payment = phonePromptMember.payment;
    setPhonePromptMember(null);
    await loadData();
    await handleOpenWhatsApp(updatedMember, payment);
  };

  const handleOpenWhatsApp = async (member: MemberRecord, payment: PaymentRecord) => {
    if (!data) return;
    if (!member.phone || member.phone.trim() === '' || member.formatted_phone === 'No phone number') {
      setPromptPhoneInput('');
      setPromptPhoneError(null);
      setPhonePromptMember({ member, payment });
      return;
    }

    const isPaid = payment.status === 'paid';
    const amountDue = payment.target_amount - payment.amount;

    if (isPaid) {
      // Send official formatted receipt directly
      const currentCollector = data.members.find(
        (m) => m.id === data.currentRound?.collector_member_id
      );
      const receipt = buildReceiptMessage({
        memberName: member.name,
        groupName: data.group.name,
        roundNumber: data.group.current_round,
        amountPaid: formatNaira(payment.amount),
        collectorName: currentCollector?.name || 'Assigned Collector',
      });
      await sendWhatsAppOrShare(member.phone, receipt);
    } else {
      // Open tone selector modal (Friendly, Firm, Urgent)
      setReminderModalMember({
        member,
        amountDue: formatNaira(amountDue),
      });
    }
  };

  const handleShareGroupSummary = async () => {
    if (!data || !data.currentRound) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const paidMembers = data.payments
      .filter((p) => p.status === 'paid')
      .map((p) => p.member_name);

    const unpaidMembers = data.payments
      .filter((p) => p.status !== 'paid')
      .map((p) => ({
        name: p.member_name,
        due: formatNaira(p.target_amount - p.amount),
      }));

    const currentCollector = data.members.find(
      (m) => m.id === data.currentRound?.collector_member_id
    );

    const nextRoundNumber = data.group.current_round + 1;
    const nextRound = data.rounds.find((r) => r.round_number === nextRoundNumber);
    const nextCollector = nextRound
      ? data.members.find((m) => m.id === nextRound.collector_member_id)?.name
      : undefined;

    const summary = buildGroupSummaryMessage({
      groupName: data.group.name,
      roundNumber: data.group.current_round,
      totalRounds: data.group.total_rounds,
      collectorName: currentCollector?.name || 'Collector',
      targetPot: formatNaira(data.currentRound.target_amount),
      collectedPot: formatNaira(data.currentRound.collected_amount),
      paidMembers,
      unpaidMembers,
      nextCollectorName: nextCollector,
      lateFeesSummary: totalLateFees > 0 ? formatNaira(totalLateFees) : undefined,
    });

    await sendWhatsAppOrShare(null, summary);
  };

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

  const targetPot = currentRound?.target_amount ?? group.contribution_amount * members.length;
  const collectedPot = currentRound?.collected_amount ?? 0;
  const outstandingPot = Math.max(0, targetPot - collectedPot);
  const isPotComplete = collectedPot >= targetPot;
  const isGroupCompleted = group.status === 'completed';

  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const unpaidCount = payments.filter((p) => p.status !== 'paid').length;
  const progressPercent = targetPot > 0 ? Math.min(100, Math.round((collectedPot / targetPot) * 100)) : 0;

  const totalLateFees = payments.reduce((acc, p) => {
    if (p.late_fee_amount && p.late_fee_amount > 0 && !p.late_fee_waived) {
      return acc + p.late_fee_amount;
    }
    return acc;
  }, 0);

  const handleExportPdf = async () => {
    if (!currentRound || !currentCollector) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await exportStatementPdf({
      group,
      round: currentRound,
      collector: currentCollector,
      members,
      payments,
    });
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
            style={({ pressed }) => [
              styles.navBackBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text
              style={[
                styles.navBackText,
                { color: colors.accentText, fontFamily: typography.bodySemiBoldFont },
              ]}>
              ← Groups
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!isGroupCompleted && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSwapModal(true);
                }}
                style={({ pressed }) => [
                  styles.swapNavBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    marginRight: 8,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.swapNavText,
                    { color: colors.accent, fontFamily: typography.bodySemiBoldFont },
                  ]}>
                  ⇄ Swap Turns
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleDeleteGroup}
              style={({ pressed }) => [
                styles.deleteBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text
                style={[
                  styles.deleteText,
                  { color: colors.unpaid, fontFamily: typography.bodyMediumFont },
                ]}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Group Title Header */}
        <View style={{ marginBottom: spacing.base }}>
          <View style={styles.titleBadgeRow}>
            <Text
              style={[
                styles.groupTitle,
                { color: colors.ink, fontFamily: typography.headingFont },
              ]}>
              {group.name}
            </Text>
            {isGroupCompleted && (
              <View
                style={[
                  styles.completedBadge,
                  { backgroundColor: colors.paid, borderRadius: radii.pill },
                ]}>
                <Text
                  style={[
                    styles.completedBadgeText,
                    { fontFamily: typography.headingSemiBoldFont },
                  ]}>
                  COMPLETED
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.groupSubtitle,
              { color: colors.muted, fontFamily: typography.bodyFont },
            ]}>
            {formatNaira(group.contribution_amount)} / {group.frequency} • {members.length} members
          </Text>
        </View>

        {/* Big Skia Rotating Ring */}
        <View style={{ marginVertical: spacing.sm, alignItems: 'center' }}>
          <RoundRing
            members={members}
            payments={payments}
            collectorMemberId={currentRound?.collector_member_id || ''}
            selectedMemberId={selectedMember?.id || null}
            onSelectMember={handleSelectMember}
            targetPot={targetPot}
            collectedPot={collectedPot}
            roundNumber={group.current_round}
            totalRounds={group.total_rounds}
            size={285}
          />
        </View>

        {/* Payout Handover Spotlight Card */}
        <View
          style={[
            styles.spotlightCard,
            {
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.base,
              marginTop: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}>
          <View style={styles.spotlightHeader}>
            <View>
              <Text
                style={[
                  styles.spotlightLabel,
                  { color: colors.muted, fontFamily: typography.bodyMediumFont },
                ]}>
                Round {group.current_round} Collector
              </Text>
              <Text
                style={[
                  styles.spotlightName,
                  { color: colors.ink, fontFamily: typography.headingFont },
                ]}>
                {currentCollector?.name || 'Assigned Member'}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.spotlightLabel,
                  { color: colors.muted, fontFamily: typography.bodyMediumFont },
                ]}>
                Total Payout
              </Text>
              <Text
                style={[
                  styles.spotlightTarget,
                  { color: colors.accent, fontFamily: typography.headingFont },
                ]}>
                {formatNaira(targetPot)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.bg, borderRadius: radii.pill, marginTop: spacing.md },
            ]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: isPotComplete ? colors.paid : colors.accent,
                  width: `${progressPercent}%`,
                  borderRadius: radii.pill,
                },
              ]}
            />
          </View>

          <View style={[styles.progressInfoRow, { marginTop: spacing.xs }]}>
            <Text
              style={[
                styles.progressInfoText,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              {paidCount} of {members.length} members paid ({progressPercent}%)
            </Text>
            <Text
              style={[
                styles.progressInfoText,
                {
                  color: outstandingPot === 0 ? colors.paid : colors.unpaid,
                  fontFamily: typography.bodyMediumFont,
                },
              ]}>
              {outstandingPot === 0 ? 'Full pot ready!' : `${formatNaira(outstandingPot)} pending`}
            </Text>
          </View>

          {totalLateFees > 0 && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: spacing.sm,
                paddingTop: spacing.xs,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}>
              <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 13 }}>
                Late fees (kept separate)
              </Text>
              <Text style={{ color: colors.accentText, fontFamily: typography.bodySemiBoldFont, fontSize: 13 }}>
                {formatNaira(totalLateFees)}
              </Text>
            </View>
          )}

          {/* Confirm Payout Handover Button */}
          {!isGroupCompleted && (
            <View style={{ marginTop: spacing.base }}>
              <Button
                label={
                  isPotComplete
                    ? `Confirm Payout Handed Over to ${currentCollector?.name || 'Collector'}`
                    : `Close Round & Hand Over Pot`
                }
                variant={isPotComplete ? 'primary' : 'secondary'}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowAdvanceModal(true);
                }}
                style={{ width: '100%' }}
              />
            </View>
          )}

          {/* Action Buttons Row */}
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            <Button
              label="Share WhatsApp Group Summary"
              variant="secondary"
              onPress={handleShareGroupSummary}
              style={{ width: '100%' }}
            />

            {/* Export Statement Action Card */}
            <Pressable
              onPress={handleExportPdf}
              style={({ pressed }) => [
                styles.plusActionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: spacing.sm }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.ink,
                    fontFamily: typography.headingSemiBoldFont,
                    fontSize: 14,
                    flexShrink: 1,
                  }}>
                  Export Statement
                </Text>
                <PlusBadge />
              </View>
              <Text
                style={{
                  color: colors.accentText,
                  fontFamily: typography.headingSemiBoldFont,
                  fontSize: 16,
                }}>
                →
              </Text>
            </Pressable>

            {/* Bulk Reminders Action Card */}
            <Pressable
              onPress={() => router.push({ pathname: '/reminders', params: { groupId: group.id } })}
              style={({ pressed }) => [
                styles.plusActionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: spacing.sm }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.ink,
                    fontFamily: typography.headingSemiBoldFont,
                    fontSize: 14,
                    flexShrink: 1,
                  }}>
                  Bulk Reminders ({unpaidCount})
                </Text>
                <PlusBadge />
              </View>
              <Text
                style={{
                  color: colors.accentText,
                  fontFamily: typography.headingSemiBoldFont,
                  fontSize: 16,
                }}>
                →
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Members Payment Records List */}
        <View style={{ marginBottom: spacing.xl }}>
          <View style={styles.listHeaderRow}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.muted, fontFamily: typography.bodyMediumFont },
              ]}>
              CONTRIBUTIONS ({paidCount}/{payments.length} PAID)
            </Text>
            <Text
              style={[
                styles.tapHint,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              Tap to update
            </Text>
          </View>

          {payments.map((p) => {
            const memberObj = members.find((m) => m.id === p.member_id);
            const isCollector = p.member_id === currentRound?.collector_member_id;
            const isPaid = p.status === 'paid';
            const isPartPaid = p.status === 'part_paid';

            return (
              <Pressable
                key={p.id}
                onLongPress={() => {
                  if (memberObj) {
                    Haptics.selectionAsync();
                    handleSelectMember(memberObj);
                  }
                }}
                onPress={() => {
                  if (memberObj) {
                    Haptics.selectionAsync();
                    handleSelectMember(memberObj);
                  }
                }}
                style={({ pressed }) => [
                  styles.paymentRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderWidth: isDark ? 1 : 0,
                    borderRadius: radii.card,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}>
                {/* One-tap Paid Turn circle */}
                <Pressable
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (memberObj) {
                      handleQuickOneTapPaid(p, memberObj);
                    }
                  }}
                  style={[
                    styles.memberDot,
                    {
                      backgroundColor: isCollector
                        ? colors.accent
                        : isPaid
                        ? colors.paid
                        : isPartPaid
                        ? '#E07A5F'
                        : colors.bg,
                      borderRadius: radii.pill,
                      borderWidth: isPaid || isCollector || isPartPaid ? 0 : 1,
                      borderColor: colors.line,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.turnText,
                      { color: isPaid || isCollector || isPartPaid ? '#FFFFFF' : colors.ink },
                    ]}>
                    {isPaid ? '✓' : `#${p.turn_order}`}
                  </Text>
                </Pressable>

                {/* Member Info */}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.memberName,
                        { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
                      ]}>
                      {p.member_name}
                    </Text>
                    {isCollector && (
                      <View
                        style={[
                          styles.collectorPill,
                          {
                            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                            borderRadius: radii.pill,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.collectorPillText,
                            { color: colors.accentText, fontFamily: typography.bodySemiBoldFont, fontWeight: '700' },
                          ]}>
                          Collector
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.subMetaRow}>
                    <Text
                      style={[
                        styles.memberPhone,
                        { color: colors.muted, fontFamily: typography.bodyFont },
                      ]}>
                      {p.member_phone}
                    </Text>
                    {p.receipt_image_uri && (
                      <Text
                        style={[
                          styles.receiptFlag,
                          { color: colors.paid, fontFamily: typography.bodyMediumFont },
                        ]}>
                        • Receipt attached
                      </Text>
                    )}
                  </View>
                </View>

                {/* Amount / Status Indicator */}
                <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
                  <Text
                    style={[
                      styles.amountStatus,
                      {
                        color: isPaid ? colors.paid : isPartPaid ? '#E07A5F' : colors.ink,
                        fontFamily: typography.headingSemiBoldFont,
                      },
                    ]}>
                    {isPaid
                      ? formatNaira(p.amount)
                      : isPartPaid
                      ? `${formatNaira(p.amount)} paid`
                      : formatNaira(p.target_amount)}
                  </Text>
                  <Text
                    style={[
                      styles.statusSubText,
                      {
                        color: isPaid ? colors.paid : isPartPaid ? '#E07A5F' : colors.unpaid,
                        fontFamily: typography.bodyFont,
                      },
                    ]}>
                    {isPaid ? 'Paid' : isPartPaid ? 'Part Paid' : 'Unpaid'}
                  </Text>
                  {p.late_fee_amount && p.late_fee_amount > 0 ? (
                    <Text
                      style={{
                        color: p.late_fee_waived ? colors.muted : colors.accentText,
                        fontSize: 11,
                        fontFamily: typography.bodyFont,
                        marginTop: 2,
                      }}>
                      {p.late_fee_waived ? 'Fee waived' : `+${formatNaira(p.late_fee_amount)} late`}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Payment Update Bottom Sheet */}
      <PaymentBottomSheet
        visible={sheetVisible}
        member={selectedMember}
        payment={selectedPayment}
        group={group}
        dueDate={currentRound?.due_date}
        onRefresh={loadData}
        onClose={() => setSheetVisible(false)}
        onSavePayment={handleSavePayment}
        onOpenWhatsApp={handleOpenWhatsApp}
      />

      {/* Advance Round Confirmation Modal */}
      <Modal visible={showAdvanceModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.advanceModalSheet,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.card,
                borderColor: colors.line,
                borderWidth: isDark ? 1 : 0,
                padding: spacing.lg,
              },
            ]}>
            <Text
              style={[
                styles.modalTitle,
                { color: colors.ink, fontFamily: typography.headingFont },
              ]}>
              Confirm Payout Handover
            </Text>

            <Text
              style={[
                styles.modalDescription,
                { color: colors.muted, fontFamily: typography.bodyFont, marginVertical: spacing.md },
              ]}>
              Has{' '}
              <Text style={{ color: colors.accent, fontWeight: 'bold' }}>
                {currentCollector?.name || 'the collector'}
              </Text>{' '}
              confirmed receipt of their round payout?
              {'\n\n'}
              • Target Pot: <Text style={{ color: colors.ink }}>{formatNaira(targetPot)}</Text>
              {'\n'}• Collected: <Text style={{ color: colors.ink }}>{formatNaira(collectedPot)}</Text>
              {outstandingPot > 0 && (
                <Text style={{ color: colors.unpaid }}>
                  {'\n'}• Warning: {formatNaira(outstandingPot)} is still outstanding.
                </Text>
              )}
            </Text>

            <View style={styles.modalBtnRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setShowAdvanceModal(false)}
                />
              </View>
              <View style={{ flex: 1.4 }}>
                <Button
                  label={group.current_round >= group.total_rounds ? 'Complete Ajo' : 'Confirm & Rotate Ring'}
                  variant="primary"
                  disabled={advancing}
                  onPress={handleConfirmAdvanceRound}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {/* WhatsApp Reminder Tone Selector Modal */}
      {reminderModalMember && (
        <WhatsAppReminderModal
          visible={!!reminderModalMember}
          memberName={reminderModalMember.member.name}
          phone={reminderModalMember.member.phone}
          groupName={group.name}
          roundNumber={group.current_round}
          amountDue={reminderModalMember.amountDue}
          dueDate={currentRound?.due_date}
          collectorName={currentCollector?.name || 'Assigned Collector'}
          onClose={() => setReminderModalMember(null)}
        />
      )}

      {/* Turn Swapping Modal */}
      <SwapTurnsModal
        visible={showSwapModal}
        groupId={group.id}
        members={members}
        currentRound={group.current_round}
        onClose={() => setShowSwapModal(false)}
        onSwapSuccess={async () => {
          await loadData();
        }}
      />

      {/* Missing Phone Number Prompt Modal */}
      {phonePromptMember && (
        <Modal visible={Boolean(phonePromptMember)} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setPhonePromptMember(null)}>
            <Pressable
              style={[
                styles.promptModalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  borderWidth: isDark ? 1 : 0,
                  padding: spacing.lg,
                },
              ]}
              onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.modalTitle, { color: colors.ink, fontFamily: typography.headingFont }]}>
                Phone number needed
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: typography.bodyFont,
                  fontSize: 14,
                  lineHeight: 20,
                  marginVertical: spacing.sm,
                }}>
                Add a phone number for {phonePromptMember.member.name} to send WhatsApp reminders or receipts.
              </Text>

              <TextInput
                placeholder="e.g. 0803 123 4567"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                value={promptPhoneInput}
                onChangeText={(val) => {
                  setPromptPhoneInput(val);
                  setPromptPhoneError(null);
                }}
                style={[
                  styles.promptInput,
                  {
                    backgroundColor: colors.bg,
                    borderColor: promptPhoneError ? colors.unpaid : colors.line,
                    color: colors.ink,
                    borderRadius: radii.sm,
                    fontFamily: typography.bodyFont,
                    padding: spacing.md,
                    marginBottom: promptPhoneError ? spacing.xs : spacing.md,
                  },
                ]}
              />

              {promptPhoneError && (
                <Text style={{ color: colors.unpaid, fontFamily: typography.bodyFont, fontSize: 12, marginBottom: spacing.sm }}>
                  {promptPhoneError}
                </Text>
              )}

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => setPhonePromptMember(null)}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Save and open WhatsApp"
                  variant="primary"
                  onPress={handleSavePhoneAndOpenWhatsApp}
                  style={{ flex: 2 }}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Floating Undo Toast for 1-Tap Paid */}
      {undoToast && (
        <View
          style={[
            styles.undoToastCard,
            {
              backgroundColor: isDark ? '#1F2937' : '#111827',
              borderRadius: radii.card,
              borderColor: colors.line,
            },
          ]}>
          <Text
            numberOfLines={1}
            style={{
              color: '#FFFFFF',
              fontFamily: typography.bodyMediumFont,
              fontSize: 14,
              flex: 1,
              marginRight: spacing.sm,
            }}>
            {undoToast.memberName} marked paid
          </Text>
          <Pressable
            onPress={handleUndoPayment}
            style={[styles.undoButton, { backgroundColor: colors.accent, borderRadius: radii.pill }]}>
            <Text
              style={{
                color: colors.onAccent,
                fontFamily: typography.headingSemiBoldFont,
                fontSize: 13,
                fontWeight: '700',
              }}>
              Undo
            </Text>
          </Pressable>
        </View>
      )}
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  promptModalCard: {
    width: '90%',
    maxWidth: 400,
  },
  promptInput: {
    borderWidth: 1,
    fontSize: 15,
  },
  undoToastCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navBackText: {
    fontSize: 16,
  },
  swapNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapNavText: {
    fontSize: 13,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 13,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
  completedBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  completedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  groupSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  spotlightCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  spotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  spotlightLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  spotlightName: {
    fontSize: 18,
    marginTop: 2,
  },
  spotlightTarget: {
    fontSize: 20,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressInfoText: {
    fontSize: 12,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  tapHint: {
    fontSize: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberDot: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberName: {
    fontSize: 15,
    maxWidth: 160,
  },
  collectorPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  collectorPillText: {
    fontSize: 10,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  memberPhone: {
    fontSize: 12,
  },
  receiptFlag: {
    fontSize: 11,
    marginLeft: 6,
  },
  amountStatus: {
    fontSize: 15,
  },
  statusSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  advanceModalSheet: {
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  plusActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    minHeight: 52,
  },
});
