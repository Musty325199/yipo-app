import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ShareIntentFile } from 'expo-share-intent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  getAllActiveGroups,
  getGroupDetails,
  recordPayment,
  getMostRecentActiveGroup,
} from '@/db/queries';
import { GroupRecord, PaymentRecord, MemberRecord, RoundRecord } from '@/db/schema';

interface ShareReceiptModalProps {
  visible: boolean;
  files: ShareIntentFile[];
  onClose: () => void;
  onPaymentRecorded?: (groupId: string) => void;
}

export function ShareReceiptModal({
  visible,
  files,
  onClose,
  onPaymentRecorded,
}: ShareReceiptModalProps) {
  const { colors, typography, radii, spacing, isDark, formatNaira } = useTheme();
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Drag down to close gesture
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible, translateY]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
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

  // Group & Round data
  const [allGroups, setAllGroups] = useState<GroupRecord[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupRecord | null>(null);
  const [groupDetails, setGroupDetails] = useState<{
    group: GroupRecord;
    members: MemberRecord[];
    rounds: RoundRecord[];
    currentRound: RoundRecord | null;
    payments: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number })[];
  } | null>(null);

  // Form selections
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [noteStr, setNoteStr] = useState('WhatsApp receipt');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const currentFile = files[currentIndex] || null;
  const totalCount = files.length;

  // Load groups and initial group details when modal opens
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const groups = await getAllActiveGroups();
        if (!isMounted) return;
        setAllGroups(groups);

        const mostRecent = await getMostRecentActiveGroup();
        const activeGroup = mostRecent || (groups.length > 0 ? groups[0] : null);
        if (activeGroup) {
          setSelectedGroup(activeGroup);
          const details = await getGroupDetails(activeGroup.id);
          if (isMounted) {
            setGroupDetails(details);
          }
        }
      } catch {
        // Handled via empty state
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleSelectGroup = async (g: GroupRecord) => {
    setSelectedGroup(g);
    setShowGroupPicker(false);
    setSelectedPaymentId(null);
    setAmountStr('');
    setShowAllMembers(false);
    try {
      const details = await getGroupDetails(g.id);
      setGroupDetails(details);
    } catch {
      setGroupDetails(null);
    }
  };

  // Candidates for payments: unpaid members by default, or all if toggled
  const eligiblePayments = useMemo(() => {
    if (!groupDetails) return [];
    if (showAllMembers) return groupDetails.payments;
    return groupDetails.payments.filter((p) => p.status !== 'paid');
  }, [groupDetails, showAllMembers]);

  // When a payment candidate is selected, pre-fill amount with remaining balance
  const handleSelectPayment = (paymentId: string) => {
    Haptics.selectionAsync();
    setSelectedPaymentId(paymentId);
    if (!groupDetails) return;

    const targetPayment = groupDetails.payments.find((p) => p.id === paymentId);
    if (targetPayment) {
      const remaining = Math.max(0, targetPayment.target_amount - targetPayment.amount);
      setAmountStr(String(remaining > 0 ? remaining : targetPayment.target_amount));
    }
  };

  const selectedPayment = groupDetails?.payments.find((p) => p.id === selectedPaymentId) || null;
  const isMemberAlreadyPaid = selectedPayment?.status === 'paid';

  // Advance queue or finish
  const handleNextOrFinish = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedPaymentId(null);
      setAmountStr('');
      setNoteStr('WhatsApp receipt');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    }
  };

  // Skip current receipt in multi-share
  const handleSkipCurrent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleNextOrFinish();
  };

  // Record payment confirm
  const handleConfirmRecord = async () => {
    if (!currentFile || !selectedPayment || !groupDetails) return;

    const parsedAmount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Amount required', 'Please enter a valid contribution amount.');
      return;
    }

    setSaving(true);
    try {
      // 1. Compress image to max 1200px width with 0.8 JPEG quality
      const compressed = await manipulateAsync(
        currentFile.path,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      // 2. Save permanently to app documents receipts folder
      const receiptsDir = `${FileSystem.documentDirectory}receipts/`;
      const dirInfo = await FileSystem.getInfoAsync(receiptsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(receiptsDir, { intermediates: true });
      }

      const permanentUri = `${receiptsDir}receipt_${Date.now()}_${currentIndex}.jpg`;
      await FileSystem.copyAsync({
        from: compressed.uri,
        to: permanentUri,
      });

      // 3. Record payment in database
      const newAmount = selectedPayment.amount + parsedAmount;
      const newStatus = newAmount >= selectedPayment.target_amount ? 'paid' : 'part_paid';

      await recordPayment({
        paymentId: selectedPayment.id,
        amount: newAmount,
        status: newStatus,
        receiptImageUri: permanentUri,
        note: noteStr.trim() || 'WhatsApp receipt',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onPaymentRecorded && selectedGroup) {
        onPaymentRecorded(selectedGroup.id);
      }

      handleNextOrFinish();
    } catch {
      Alert.alert('Save error', 'Failed to save payment receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !currentFile) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Animated.View style={[styles.container, { backgroundColor: colors.surface }, containerAnimatedStyle]}>
        {/* Header (with drag down to dismiss) */}
        <View
          {...panResponder.panHandlers}
          style={[
            styles.header,
            {
              borderBottomColor: colors.line,
              paddingTop: Math.max(insets.top, 16),
            },
          ]}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={{ color: colors.muted, fontFamily: typography.bodyMediumFont, fontSize: 15 }}>
              Cancel
            </Text>
          </Pressable>

          <Text style={[styles.title, { color: colors.ink, fontFamily: typography.headingSemiBoldFont }]}>
            {totalCount > 1 ? `Receipt ${currentIndex + 1} of ${totalCount}` : 'Record payment'}
          </Text>

          {totalCount > 1 ? (
            <Pressable onPress={handleSkipCurrent} style={styles.headerBtnRight}>
              <Text style={{ color: colors.accentText, fontFamily: typography.bodyMediumFont, fontSize: 14 }}>
                Skip
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : allGroups.length === 0 ? (
          /* Edge case: No groups created yet */
          <View style={[styles.centerBox, { padding: spacing.xl }]}>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
              ]}>
              No active groups found
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: typography.bodyFont,
                fontSize: 14,
                textAlign: 'center',
                marginVertical: spacing.md,
                lineHeight: 20,
              }}>
              Create an ajo group first before recording payments from shared receipts.
            </Text>
            <Button
              label="Create a group"
              variant="primary"
              onPress={() => {
                onClose();
                router.push('/group/new');
              }}
              style={{ width: '100%', marginBottom: spacing.sm }}
            />
            <Button label="Dismiss" variant="ghost" onPress={onClose} style={{ width: '100%' }} />
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.base, paddingBottom: 120 }}>
            {/* Receipt Image Preview */}
            <View
              style={[
                styles.previewContainer,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                },
              ]}>
              <Image source={{ uri: currentFile.path }} style={styles.previewImage} resizeMode="contain" />
            </View>

            {/* Group Selector */}
            <View style={{ marginTop: spacing.base }}>
              <Text style={[styles.fieldLabel, { color: colors.ink, fontFamily: typography.bodyMediumFont }]}>
                Group
              </Text>
              <Pressable
                onPress={() => setShowGroupPicker((prev) => !prev)}
                style={[
                  styles.selectorBox,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                  },
                ]}>
                <Text style={{ color: colors.ink, fontFamily: typography.headingSemiBoldFont, fontSize: 14 }}>
                  {selectedGroup?.name || 'Select group'}
                </Text>
                {allGroups.length > 1 && (
                  <Text style={{ color: colors.accentText, fontFamily: typography.bodyMediumFont, fontSize: 12 }}>
                    {showGroupPicker ? 'Close ▲' : 'Change group ▼'}
                  </Text>
                )}
              </Pressable>

              {/* Group Picker Dropdown */}
              {showGroupPicker && (
                <View
                  style={[
                    styles.groupDropdown,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                      borderRadius: radii.card,
                    },
                  ]}>
                  {allGroups.map((g) => {
                    const isSelected = g.id === selectedGroup?.id;
                    return (
                      <Pressable
                        key={g.id}
                        onPress={() => handleSelectGroup(g)}
                        style={[
                          styles.groupItem,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(245, 158, 11, 0.15)'
                                : '#FEF3C7'
                              : 'transparent',
                            borderBottomColor: colors.line,
                          },
                        ]}>
                        <Text
                          style={{
                            color: isSelected ? colors.accentText : colors.ink,
                            fontFamily: isSelected ? typography.headingSemiBoldFont : typography.bodyFont,
                            fontSize: 14,
                          }}>
                          {g.name}
                        </Text>
                        <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 12 }}>
                          Round {g.current_round}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Member Picker */}
            <View style={{ marginTop: spacing.base }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                <Text style={[styles.fieldLabel, { color: colors.ink, fontFamily: typography.bodyMediumFont, marginBottom: 0 }]}>
                  Select member
                </Text>
                <Pressable onPress={() => setShowAllMembers((prev) => !prev)}>
                  <Text style={{ color: colors.accentText, fontFamily: typography.bodyMediumFont, fontSize: 12 }}>
                    {showAllMembers ? 'Show unpaid only' : 'Show all members'}
                  </Text>
                </Pressable>
              </View>

              {eligiblePayments.length === 0 ? (
                <View
                  style={[
                    styles.emptyNoticeBox,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.line,
                      borderRadius: radii.card,
                    },
                  ]}>
                  <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 13, textAlign: 'center' }}>
                    All members in this round have paid in full.
                  </Text>
                  <Pressable onPress={() => setShowAllMembers(true)} style={{ marginTop: 6 }}>
                    <Text style={{ color: colors.accentText, fontFamily: typography.headingSemiBoldFont, fontSize: 13, textAlign: 'center' }}>
                      Show all members to record extra payment
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 6, marginTop: 4 }}>
                  {eligiblePayments.map((p) => {
                    const isSelected = p.id === selectedPaymentId;
                    const remaining = Math.max(0, p.target_amount - p.amount);

                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => handleSelectPayment(p.id)}
                        style={[
                          styles.memberItem,
                          {
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(245, 158, 11, 0.2)'
                                : '#FEF3C7'
                              : colors.bg,
                            borderColor: isSelected ? colors.accent : colors.line,
                            borderRadius: radii.card,
                          },
                        ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <View
                            style={[
                              styles.turnBadge,
                              {
                                backgroundColor: isSelected ? colors.accent : colors.surface,
                                borderRadius: radii.pill,
                              },
                            ]}>
                            <Text
                              style={{
                                color: isSelected ? colors.onAccent : colors.ink,
                                fontFamily: typography.headingSemiBoldFont,
                                fontSize: 11,
                              }}>
                              #{p.turn_order}
                            </Text>
                          </View>
                          <Text
                            numberOfLines={2}
                            style={{
                              color: colors.ink,
                              fontFamily: typography.headingSemiBoldFont,
                              fontSize: 14,
                              marginLeft: spacing.sm,
                              flex: 1,
                            }}>
                            {p.member_name}
                          </Text>
                        </View>

                        <Text
                          style={{
                            color: remaining > 0 ? colors.unpaid : colors.paid,
                            fontFamily: typography.bodyMediumFont,
                            fontSize: 12,
                          }}>
                          {remaining > 0 ? `Due: ${formatNaira(remaining)}` : 'Fully paid'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Warning if member already paid */}
            {isMemberAlreadyPaid && (
              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                    borderColor: colors.accent,
                    borderRadius: radii.card,
                    marginTop: spacing.sm,
                  },
                ]}>
                <Text style={{ color: colors.accentText, fontFamily: typography.bodyFont, fontSize: 12, lineHeight: 18 }}>
                  {selectedPayment?.member_name} has already paid in full for this round. Additional payment will be added.
                </Text>
              </View>
            )}

            {/* Amount Field */}
            <View style={{ marginTop: spacing.base }}>
              <Text style={[styles.fieldLabel, { color: colors.ink, fontFamily: typography.bodyMediumFont }]}>
                Amount to record
              </Text>
              <TextInput
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder="e.g. 20000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.line,
                    color: colors.ink,
                    borderRadius: radii.card,
                    fontFamily: typography.headingSemiBoldFont,
                    fontSize: 16,
                  },
                ]}
              />
              {amountStr ? (
                <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 12, marginTop: 4 }}>
                  {formatNaira(parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10))}
                </Text>
              ) : null}
            </View>

            {/* Note Field */}
            <View style={{ marginTop: spacing.base }}>
              <Text style={[styles.fieldLabel, { color: colors.ink, fontFamily: typography.bodyMediumFont }]}>
                Note (optional)
              </Text>
              <TextInput
                value={noteStr}
                onChangeText={setNoteStr}
                placeholder="e.g. Bank transfer, WhatsApp receipt"
                placeholderTextColor={colors.muted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.line,
                    color: colors.ink,
                    borderRadius: radii.card,
                    fontFamily: typography.bodyFont,
                    fontSize: 14,
                  },
                ]}
              />
            </View>
          </ScrollView>
        )}

        {/* Footer Confirm */}
        {allGroups.length > 0 && (
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.line,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}>
            <Button
              label={saving ? 'Recording payment...' : 'Record payment'}
              variant="primary"
              disabled={!selectedPaymentId || saving || !amountStr.trim()}
              onPress={handleConfirmRecord}
              style={{ width: '100%' }}
            />
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    paddingVertical: 4,
    width: 60,
  },
  headerBtnRight: {
    paddingVertical: 4,
    width: 60,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  previewContainer: {
    height: 180,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  selectorBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  groupDropdown: {
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  turnBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNoticeBox: {
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  warningBox: {
    padding: 10,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
});
