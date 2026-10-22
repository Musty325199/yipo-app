import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { ImageViewerModal } from '@/components/ui/ImageViewerModal';
import { MemberRecord, PaymentRecord, GroupRecord } from '@/db/schema';
import { unwaiveLateFee } from '@/db/queries';

interface PaymentBottomSheetProps {
  visible: boolean;
  member: MemberRecord | null;
  payment: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number }) | null;
  group?: GroupRecord;
  dueDate?: string;
  onRefresh?: () => void;
  onClose: () => void;
  onSavePayment: (input: {
    paymentId: string;
    amount: number;
    status: 'unpaid' | 'part_paid' | 'paid';
    receiptImageUri?: string | null;
    note?: string | null;
    lateFeeAmount?: number;
    lateFeeWaived?: boolean;
    lateFeeWaivedReason?: string | null;
  }) => Promise<void>;
  onOpenWhatsApp?: (member: MemberRecord, payment: PaymentRecord) => void;
}

export function PaymentBottomSheet(props: PaymentBottomSheetProps) {
  if (!props.visible || !props.member || !props.payment) {
    return null;
  }
  return (
    <PaymentSheetContent
      key={props.payment.id}
      {...props}
      member={props.member}
      payment={props.payment}
    />
  );
}

interface PaymentSheetContentProps extends PaymentBottomSheetProps {
  member: MemberRecord;
  payment: PaymentRecord & { member_name: string; member_phone: string; turn_order: number };
}

function PaymentSheetContent({
  visible,
  member,
  payment,
  group,
  dueDate,
  onRefresh,
  onClose,
  onSavePayment,
  onOpenWhatsApp,
}: PaymentSheetContentProps) {
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  const [mode, setMode] = useState<'quick' | 'part'>(
    payment.status === 'part_paid' ? 'part' : 'quick'
  );
  const [partAmountInput, setPartAmountInput] = useState(
    payment.amount > 0 ? payment.amount.toString() : ''
  );
  const [noteInput, setNoteInput] = useState(payment.note || '');
  const [receiptUri, setReceiptUri] = useState<string | null>(
    payment.receipt_image_uri || null
  );
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drag down to close gesture
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = 0;
  }, [payment.id, translateY]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            translateY.value = withTiming(800, { duration: 220 }, (finished) => {
              if (finished) {
                runOnJS(onClose)();
              }
            });
          } else {
            translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
          }
        },
      }),
    [onClose, translateY]
  );

  // Late fee state & calculations
  const policyFee =
    group?.late_fee_type === 'percentage'
      ? Math.round(((group.contribution_amount || 0) * (group.late_fee_value || 0)) / 100)
      : Math.round(group?.late_fee_value || 0);

  const [lateFeeAmount, setLateFeeAmount] = useState<number>(payment.late_fee_amount || 0);
  const [isWaived, setIsWaived] = useState<boolean>(Boolean(payment.late_fee_waived));
  const [waivedReason, setWaivedReason] = useState<string>(payment.late_fee_waived_reason || '');
  const [showWaiveModal, setShowWaiveModal] = useState(false);
  const [waiveReasonInput, setWaiveReasonInput] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  let daysLate = 1;
  const paymentTimeStr = payment.paid_at || payment.created_at;
  if (dueDate && paymentTimeStr) {
    const dueTime = new Date(dueDate).getTime();
    const graceMs = (group?.late_fee_grace_days || 0) * 86400000;
    const compareTime = new Date(paymentTimeStr).getTime();
    if (compareTime > dueTime + graceMs) {
      daysLate = Math.max(1, Math.ceil((compareTime - (dueTime + graceMs)) / 86400000));
    }
  }

  const handleApplyLateFee = async () => {
    const feeToSet = policyFee > 0 ? policyFee : 1000;
    setLateFeeAmount(feeToSet);
    setIsWaived(false);
    setWaivedReason('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (payment.amount > 0) {
      try {
        await onSavePayment({
          paymentId: payment.id,
          amount: payment.amount,
          status: payment.status,
          receiptImageUri: receiptUri,
          note: noteInput.trim() || null,
          lateFeeAmount: feeToSet,
          lateFeeWaived: false,
          lateFeeWaivedReason: null,
        });
        if (onRefresh) onRefresh();
      } catch {}
    }
  };

  const handleClearLateFee = async () => {
    setLateFeeAmount(0);
    setIsWaived(false);
    setWaivedReason('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (payment.amount > 0) {
      try {
        await onSavePayment({
          paymentId: payment.id,
          amount: payment.amount,
          status: payment.status,
          receiptImageUri: receiptUri,
          note: noteInput.trim() || null,
          lateFeeAmount: 0,
          lateFeeWaived: false,
          lateFeeWaivedReason: null,
        });
        if (onRefresh) onRefresh();
      } catch {}
    }
  };

  const handleConfirmWaive = async () => {
    const trimmed = waiveReasonInput.trim();
    if (!trimmed) {
      Alert.alert('Reason Required', 'Please enter a reason for waiving the late fee.');
      return;
    }
    const feeToSet = lateFeeAmount > 0 ? lateFeeAmount : (policyFee > 0 ? policyFee : 1000);
    setLateFeeAmount(feeToSet);
    setIsWaived(true);
    setWaivedReason(trimmed);
    setShowWaiveModal(false);
    setWaiveReasonInput('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (payment.amount > 0) {
      try {
        await onSavePayment({
          paymentId: payment.id,
          amount: payment.amount,
          status: payment.status,
          receiptImageUri: receiptUri,
          note: noteInput.trim() || null,
          lateFeeAmount: feeToSet,
          lateFeeWaived: true,
          lateFeeWaivedReason: trimmed,
        });
        if (onRefresh) onRefresh();
      } catch {}
    }
  };

  const handleUnwaive = async () => {
    try {
      await unwaiveLateFee(payment.id);
      setIsWaived(false);
      setWaivedReason('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (onRefresh) onRefresh();
    } catch {
      setIsWaived(false);
      setWaivedReason('');
    }
  };

  const targetAmount = payment.target_amount;
  const isPaid = payment.status === 'paid';
  const isPartPaid = payment.status === 'part_paid';

  const handleQuickMarkPaid = async () => {
    setSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await onSavePayment({
        paymentId: payment.id,
        amount: targetAmount,
        status: 'paid',
        receiptImageUri: receiptUri,
        note: noteInput.trim() || null,
        lateFeeAmount: lateFeeAmount,
        lateFeeWaived: isWaived,
        lateFeeWaivedReason: isWaived ? waivedReason : null,
      });
      onClose();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePartPayment = async () => {
    const parsed = parseInt(partAmountInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid contribution amount.');
      return;
    }

    const finalAmount = Math.min(parsed, targetAmount);
    const newStatus = finalAmount >= targetAmount ? 'paid' : 'part_paid';

    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onSavePayment({
        paymentId: payment.id,
        amount: finalAmount,
        status: newStatus,
        receiptImageUri: receiptUri,
        note: noteInput.trim() || null,
        lateFeeAmount: lateFeeAmount,
        lateFeeWaived: isWaived,
        lateFeeWaivedReason: isWaived ? waivedReason : null,
      });
      onClose();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReset = async () => {
    setShowResetModal(false);
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onSavePayment({
        paymentId: payment.id,
        amount: 0,
        status: 'unpaid',
        receiptImageUri: null,
        note: null,
        lateFeeAmount: 0,
        lateFeeWaived: false,
        lateFeeWaivedReason: null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handlePickReceipt = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to attach receipts.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      Alert.alert('Photo Error', 'Unable to open photo picker.');
    }
  };

  const handleTakeReceiptPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to take receipt photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      Alert.alert('Camera Error', 'Unable to open camera.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(200)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              borderTopWidth: 1,
            },
            sheetAnimatedStyle,
          ]}>
          {/* Grab Handle */}
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl }}>
            {/* Member Info Row */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.memberName,
                    { color: colors.ink, fontFamily: typography.headingFont },
                  ]}>
                  {member.name}
                </Text>
                <Text
                  style={[
                    styles.memberMeta,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  Turn #{member.turn_order} • {member.formatted_phone}
                </Text>
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push(`/member/${member.id}`);
                  }}
                  style={{ marginTop: 4 }}>
                  <Text
                    style={{
                      color: colors.accentText,
                      fontSize: 12,
                      fontFamily: typography.bodySemiBoldFont,
                    }}>
                    View reliability history →
                  </Text>
                </Pressable>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isPaid
                      ? colors.paid
                      : isPartPaid
                      ? colors.partPaid
                      : colors.bg,
                    borderRadius: radii.pill,
                  },
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: isPaid || isPartPaid ? '#FFFFFF' : colors.muted,
                      fontFamily: typography.headingSemiBoldFont,
                    },
                  ]}>
                  {isPaid ? 'PAID' : isPartPaid ? 'PART PAID' : 'UNPAID'}
                </Text>
              </View>
            </View>

            {/* Target Card */}
            <View
              style={[
                styles.targetCard,
                {
                  backgroundColor: colors.bg,
                  borderRadius: radii.card,
                  borderColor: colors.line,
                  borderWidth: 1,
                  padding: spacing.md,
                  marginVertical: spacing.md,
                },
              ]}>
              <View style={styles.targetCol}>
                <Text
                  style={[
                    styles.targetLabel,
                    { color: colors.muted, fontFamily: typography.bodyFont },
                  ]}>
                  Contribution due
                </Text>
                <Text
                  style={[
                    styles.targetAmount,
                    { color: colors.ink, fontFamily: typography.headingFont },
                  ]}>
                  {formatNaira(targetAmount)}
                </Text>
              </View>
              {payment.amount > 0 && (
                <View style={[styles.targetCol, { alignItems: 'flex-end' }]}>
                  <Text
                    style={[
                      styles.targetLabel,
                      { color: colors.muted, fontFamily: typography.bodyFont },
                    ]}>
                    Recorded so far
                  </Text>
                  <Text
                    style={[
                      styles.targetAmount,
                      {
                        color: isPaid ? colors.paid : colors.partPaid,
                        fontFamily: typography.headingFont,
                      },
                    ]}>
                    {formatNaira(payment.amount)}
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Reset to Unpaid (Immediate access without scrolling) */}
            {payment.amount > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  marginTop: -spacing.xs,
                  marginBottom: spacing.sm,
                }}>
                <Pressable
                  onPress={() => setShowResetModal(true)}
                  hitSlop={8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 4,
                  }}>
                  <Text
                    style={{
                      color: colors.unpaid,
                      fontFamily: typography.bodyMediumFont,
                      fontSize: 13,
                    }}>
                    Reset payment back to unpaid ↺
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Late Fee Policy / Waiver Card (Shown when group has late fee rule or fee is applied) */}
            {(lateFeeAmount > 0 || (group?.late_fee_type && group.late_fee_type !== 'none')) && (
            <View
              style={{
                backgroundColor: isWaived
                  ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5')
                  : (isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7'),
                borderColor: isWaived
                  ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0')
                  : (isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A'),
                borderRadius: radii.card,
                borderWidth: 1,
                padding: spacing.md,
                marginBottom: spacing.md,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text
                    style={{
                      color: isWaived ? colors.paid : colors.accentText,
                      fontFamily: typography.headingSemiBoldFont,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                    Late fees (kept separate)
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: colors.ink,
                      fontFamily: typography.bodyFont,
                      fontSize: 13,
                      marginTop: 2,
                      lineHeight: 18,
                    }}>
                    {lateFeeAmount > 0
                      ? isWaived
                        ? `Late fee: ${formatNaira(lateFeeAmount)} (Waived: ${waivedReason || 'Organizer waiver'})`
                        : `Late fee: ${formatNaira(lateFeeAmount)}. Paid ${daysLate} day${daysLate === 1 ? '' : 's'} late.`
                      : group?.late_fee_type && group.late_fee_type !== 'none'
                      ? `Rule: ${group.late_fee_type === 'fixed' ? formatNaira(policyFee) : `${formatNaira(policyFee)} (${group.late_fee_value}%)`}, grace ${group.late_fee_grace_days || 0}d. No fee yet.`
                      : 'No late fee charged for this round.'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {lateFeeAmount > 0 ? (
                    <>
                      <Pressable
                        onPress={isWaived ? handleUnwaive : () => setShowWaiveModal(true)}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 5,
                          borderRadius: radii.pill,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}>
                        <Text
                          style={{
                            color: colors.ink,
                            fontFamily: typography.bodySemiBoldFont,
                            fontSize: 12,
                          }}>
                          {isWaived ? 'Restore' : 'Waive'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleClearLateFee}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 5,
                          borderRadius: radii.pill,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}>
                        <Text
                          style={{
                            color: colors.unpaid,
                            fontFamily: typography.bodySemiBoldFont,
                            fontSize: 12,
                          }}>
                          Clear
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable
                        onPress={handleApplyLateFee}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 5,
                          borderRadius: radii.pill,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}>
                        <Text
                          style={{
                            color: colors.accentText,
                            fontFamily: typography.bodySemiBoldFont,
                            fontSize: 12,
                          }}>
                          Apply fee
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setShowWaiveModal(true)}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 5,
                          borderRadius: radii.pill,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}>
                        <Text
                          style={{
                            color: colors.ink,
                            fontFamily: typography.bodySemiBoldFont,
                            fontSize: 12,
                          }}>
                          Waive
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            </View>
            )}

            {/* Toggle Quick Mark vs Part Payment */}
            <View style={[styles.modeTabs, { backgroundColor: colors.bg, borderRadius: radii.pill, marginVertical: spacing.sm }]}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setMode('quick');
                }}
                style={[
                  styles.modeTab,
                  mode === 'quick' && [
                    styles.activeModeTab,
                    { backgroundColor: colors.surface, borderRadius: radii.pill },
                  ],
                ]}>
                <Text
                  style={[
                    styles.modeTabText,
                    {
                      color: mode === 'quick' ? colors.ink : colors.muted,
                      fontFamily: typography.bodySemiBoldFont,
                    },
                  ]}>
                  Full payment
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setMode('part');
                }}
                style={[
                  styles.modeTab,
                  mode === 'part' && [
                    styles.activeModeTab,
                    { backgroundColor: colors.surface, borderRadius: radii.pill },
                  ],
                ]}>
                <Text
                  style={[
                    styles.modeTabText,
                    {
                      color: mode === 'part' ? colors.ink : colors.muted,
                      fontFamily: typography.bodySemiBoldFont,
                    },
                  ]}>
                  Part payment
                </Text>
              </Pressable>
            </View>

            {mode === 'quick' ? (
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  label={`Mark fully paid (${formatNaira(targetAmount)})`}
                  variant="primary"
                  disabled={saving}
                  onPress={handleQuickMarkPaid}
                  style={{ width: '100%' }}
                />
              </View>
            ) : (
              <View style={{ marginTop: spacing.sm }}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.muted, fontFamily: typography.bodyMediumFont },
                  ]}>
                  Amount paid (₦)
                </Text>
                <TextInput
                  value={partAmountInput}
                  onChangeText={setPartAmountInput}
                  placeholder={`e.g. ${targetAmount / 2}`}
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.bg,
                      color: colors.ink,
                      borderColor: colors.line,
                      borderRadius: radii.card,
                      fontFamily: typography.headingFont,
                    },
                  ]}
                />

                <Button
                  label="Save part payment"
                  variant="primary"
                  disabled={saving}
                  onPress={handleSavePartPayment}
                  style={{ width: '100%', marginTop: spacing.md }}
                />
              </View>
            )}

            {/* Note Section */}
            <View style={{ marginTop: spacing.base }}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.muted, fontFamily: typography.bodyMediumFont },
                ]}>
                Organizer note (optional)
              </Text>
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="e.g. Paid cash at shop / Sent via OPay"
                placeholderTextColor={colors.muted}
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: colors.bg,
                    color: colors.ink,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                    fontFamily: typography.bodyFont,
                  },
                ]}
              />
            </View>

            {/* Receipt Section */}
            <View style={{ marginTop: spacing.base }}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.muted, fontFamily: typography.bodyMediumFont },
                ]}>
                Receipt photo
              </Text>
              {receiptUri ? (
                <View
                  style={[
                    styles.receiptPreviewContainer,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.line,
                      borderRadius: radii.card,
                      borderWidth: 1,
                      padding: spacing.sm,
                    },
                  ]}>
                  <Pressable
                    onPress={() => setShowReceiptViewer(true)}
                    accessibilityRole="button"
                    accessibilityLabel="View full size receipt photo">
                    <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
                  </Pressable>
                  <View style={styles.receiptActions}>
                    <Pressable
                      onPress={() => setShowReceiptViewer(true)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="View full size receipt photo">
                      <Text
                        style={[
                          styles.receiptSuccessText,
                          { color: colors.paid, fontFamily: typography.bodySemiBoldFont },
                        ]}>
                        Receipt attached
                      </Text>
                      <Text
                        style={{
                          color: colors.accentText,
                          fontFamily: typography.bodyMediumFont,
                          fontSize: 12,
                          marginTop: 2,
                        }}>
                        Tap to view full size →
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setReceiptUri(null)} style={{ marginTop: 4 }}>
                      <Text
                        style={[
                          styles.removeReceiptText,
                          { color: colors.unpaid, fontFamily: typography.bodyMediumFont },
                        ]}>
                        Remove photo
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.receiptButtonRow}>
                  <Pressable
                    onPress={handlePickReceipt}
                    style={[
                      styles.receiptBtn,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.line,
                        borderRadius: radii.card,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.receiptBtnText,
                        { color: colors.ink, fontFamily: typography.bodyMediumFont },
                      ]}>
                      + Attach receipt photo
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleTakeReceiptPhoto}
                    style={[
                      styles.receiptBtn,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.line,
                        borderRadius: radii.card,
                        marginLeft: spacing.sm,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.receiptBtnText,
                        { color: colors.ink, fontFamily: typography.bodyMediumFont },
                      ]}>
                      Camera
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* WhatsApp Integration Button */}
            {onOpenWhatsApp && (
              <View style={{ marginTop: spacing.lg }}>
                <Pressable
                  onPress={() => onOpenWhatsApp(member, payment)}
                  style={[
                    styles.waButton,
                    {
                      backgroundColor: '#25D366',
                      borderRadius: radii.card,
                      paddingVertical: spacing.md,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.waButtonText,
                      { color: '#FFFFFF', fontFamily: typography.headingSemiBoldFont },
                    ]}>
                    Send WhatsApp {isPaid ? 'receipt' : 'reminder'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Reset to Unpaid */}
            {payment.amount > 0 && (
              <View style={{ marginTop: spacing.base, alignItems: 'center' }}>
                <Pressable onPress={() => setShowResetModal(true)} style={{ padding: spacing.sm }}>
                  <Text
                    style={[
                      styles.resetText,
                      { color: colors.unpaid, fontFamily: typography.bodyMediumFont },
                    ]}>
                    Reset payment back to unpaid
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Waive Late Fee Modal */}
      <Modal visible={showWaiveModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.base,
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: 1,
              padding: spacing.lg,
              width: '100%',
              maxWidth: 400,
            }}>
            <Text
              style={{
                color: colors.ink,
                fontFamily: typography.headingFont,
                fontSize: 18,
              }}>
              Waive Late Fee
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: typography.bodyFont,
                fontSize: 13,
                marginVertical: spacing.sm,
              }}>
              Please enter a reason for waiving this fee. The reason will remain in the group history record.
            </Text>

            <TextInput
              value={waiveReasonInput}
              onChangeText={setWaiveReasonInput}
              placeholder="e.g. Bank downtime, granted grace extension"
              placeholderTextColor={colors.muted}
              style={{
                backgroundColor: colors.bg,
                borderColor: colors.line,
                borderWidth: 1,
                borderRadius: radii.card,
                padding: spacing.md,
                color: colors.ink,
                fontFamily: typography.bodyFont,
                fontSize: 14,
                marginBottom: spacing.base,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowWaiveModal(false);
                  setWaiveReasonInput('');
                }}
              />
              <Button
                label="Confirm Waiver"
                variant="primary"
                onPress={handleConfirmWaive}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset to Unpaid Confirmation Modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.base,
          }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.card,
              borderColor: colors.line,
              borderWidth: 1,
              padding: spacing.lg,
              width: '100%',
              maxWidth: 400,
            }}>
            <Text
              style={{
                color: colors.ink,
                fontFamily: typography.headingFont,
                fontSize: 18,
              }}>
              Reset Payment
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: typography.bodyFont,
                fontSize: 14,
                lineHeight: 20,
                marginVertical: spacing.md,
              }}>
              Mark {member.name}&apos;s payment as unpaid? Any recorded contribution amount and attached receipt will be cleared.
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setShowResetModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Reset"
                variant="danger"
                onPress={handleConfirmReset}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Receipt Image Viewer */}
      <ImageViewerModal
        visible={showReceiptViewer}
        imageUri={receiptUri}
        onClose={() => setShowReceiptViewer(false)}
        title={`Receipt: ${member.name}`}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '94%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  memberMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  targetCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetCol: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  targetAmount: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  modeTabs: {
    flexDirection: 'row',
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeModeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
  },
  noteInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  receiptBox: {
    width: '100%',
  },
  receiptButtonRow: {
    flexDirection: 'row',
  },
  receiptBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBtnText: {
    fontSize: 13,
  },
  receiptPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  receiptActions: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  receiptSuccessText: {
    fontSize: 14,
  },
  removeReceiptText: {
    fontSize: 13,
    marginTop: 4,
  },
  waButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waButtonText: {
    fontSize: 15,
  },
  resetText: {
    fontSize: 13,
  },
});
