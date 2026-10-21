import React, { useState } from 'react';
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { MemberRecord, PaymentRecord } from '@/db/schema';

interface PaymentBottomSheetProps {
  visible: boolean;
  member: MemberRecord | null;
  payment: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number }) | null;
  onClose: () => void;
  onSavePayment: (input: {
    paymentId: string;
    amount: number;
    status: 'unpaid' | 'part_paid' | 'paid';
    receiptImageUri?: string | null;
    note?: string | null;
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
  const [saving, setSaving] = useState(false);

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
      });
      onClose();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToUnpaid = async () => {
    Alert.alert(
      'Reset Payment',
      `Mark ${member.name}'s payment as unpaid?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Unpaid',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await onSavePayment({
                paymentId: payment.id,
                amount: 0,
                status: 'unpaid',
                receiptImageUri: null,
                note: null,
              });
              onClose();
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
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
          ]}>
          {/* Grab Handle */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
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
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isPaid
                      ? colors.paid
                      : isPartPaid
                      ? '#E07A5F'
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
                  Contribution Due
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
                    Recorded So Far
                  </Text>
                  <Text
                    style={[
                      styles.targetAmount,
                      {
                        color: isPaid ? colors.paid : '#E07A5F',
                        fontFamily: typography.headingFont,
                      },
                    ]}>
                    {formatNaira(payment.amount)}
                  </Text>
                </View>
              )}
            </View>

            {/* Toggle Quick Mark vs Part Payment */}
            <View style={[styles.modeTabs, { backgroundColor: colors.bg, borderRadius: radii.pill }]}>
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
                  Full Payment
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
                  Part Payment
                </Text>
              </Pressable>
            </View>

            {mode === 'quick' ? (
              <View style={{ marginTop: spacing.md }}>
                <Button
                  label={`Mark Fully Paid (${formatNaira(targetAmount)})`}
                  variant="primary"
                  disabled={saving}
                  onPress={handleQuickMarkPaid}
                  style={{ width: '100%' }}
                />
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.muted, fontFamily: typography.bodyMediumFont },
                  ]}>
                  Amount Paid (₦)
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
                  label="Save Part Payment"
                  variant="primary"
                  disabled={saving}
                  onPress={handleSavePartPayment}
                  style={{ width: '100%', marginTop: spacing.md }}
                />
              </View>
            )}

            {/* Note & Receipt Section */}
            <View style={{ marginTop: spacing.lg }}>
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.muted, fontFamily: typography.bodyMediumFont },
                ]}>
                Organizer Note (Optional)
              </Text>
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="e.g. Paid via bank transfer at 10:30am"
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

              {/* Receipt Image Row */}
              <View style={[styles.receiptBox, { marginTop: spacing.md }]}>
                {receiptUri ? (
                  <View style={styles.receiptPreviewContainer}>
                    <Image source={{ uri: receiptUri }} style={styles.receiptThumb} />
                    <View style={styles.receiptActions}>
                      <Text
                        style={[
                          styles.receiptSuccessText,
                          { color: colors.paid, fontFamily: typography.bodySemiBoldFont },
                        ]}>
                        Receipt attached
                      </Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setReceiptUri(null);
                        }}>
                        <Text
                          style={[
                            styles.removeReceiptText,
                            { color: colors.unpaid, fontFamily: typography.bodyFont },
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
                        + Attach Receipt Photo
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
                    Send WhatsApp {isPaid ? 'Receipt' : 'Reminder'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Reset to Unpaid */}
            {payment.amount > 0 && (
              <View style={{ marginTop: spacing.base, alignItems: 'center' }}>
                <Pressable onPress={handleResetToUnpaid} style={{ padding: spacing.sm }}>
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
    maxHeight: '85%',
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
