import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
import { MemberRecord } from '@/db/schema';
import { swapMemberTurns } from '@/db/queries';

interface SwapTurnsModalProps {
  visible: boolean;
  groupId: string;
  members: MemberRecord[];
  currentRound: number;
  onClose: () => void;
  onSwapSuccess: () => void;
}

export function SwapTurnsModal({
  visible,
  groupId,
  members,
  currentRound,
  onClose,
  onSwapSuccess,
}: SwapTurnsModalProps) {
  const { colors, typography, spacing, radii, isDark } = useTheme();

  // Eligible members for swapping: turns >= currentRound
  const eligible = members.filter((m) => m.payout_round >= currentRound);

  const [memberAId, setMemberAId] = useState<string>(eligible[0]?.id || '');
  const [memberBId, setMemberBId] = useState<string>(eligible[1]?.id || '');
  const [reason, setReason] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  // Drag down to close gesture
  const translateY = useSharedValue(0);

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
            translateY.value = withTiming(600, { duration: 200 }, (finished) => {
              if (finished) {
                runOnJS(onClose)();
                translateY.value = 0;
              }
            });
          } else {
            translateY.value = withSpring(0, { damping: 15, stiffness: 300 });
          }
        },
      }),
    [onClose, translateY]
  );

  const memberA = members.find((m) => m.id === memberAId);
  const memberB = members.find((m) => m.id === memberBId);

  const handleExecuteSwap = async () => {
    if (!memberAId || !memberBId) {
      Alert.alert('Selection required', 'Please select two members to swap turns.');
      return;
    }
    if (memberAId === memberBId) {
      Alert.alert('Invalid swap', 'Please select two different members.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please enter a reason for this swap (e.g. Emergency expense).');
      return;
    }

    setIsSwapping(true);
    try {
      await swapMemberTurns(groupId, memberAId, memberBId, reason.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSwapSuccess();
      onClose();
    } catch (e: unknown) {
      Alert.alert('Swap failed', e instanceof Error ? e.message : 'Could not swap turns');
    } finally {
      setIsSwapping(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

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
            <Text
              style={[
                styles.title,
                { color: colors.ink, fontFamily: typography.headingFont },
              ]}>
              Swap payout turns
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              Exchange collection rounds between two members. An audit note is recorded.
            </Text>

            {/* Member A Selector */}
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.muted, fontFamily: typography.bodyMediumFont, marginTop: spacing.base },
              ]}>
              First member:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {eligible.map((m) => {
                const isSelected = m.id === memberAId;
                return (
                  <Pressable
                    key={`a-${m.id}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMemberAId(m.id);
                    }}
                    style={[
                      styles.memberPill,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.bg,
                        borderColor: colors.line,
                        borderRadius: radii.pill,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.memberPillText,
                        {
                          color: isSelected ? colors.onAccent : colors.muted,
                          fontFamily: typography.bodySemiBoldFont,
                        },
                      ]}>
                      #{m.payout_round} {m.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Member B Selector */}
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.muted, fontFamily: typography.bodyMediumFont, marginTop: spacing.md },
              ]}>
              Second member (to swap with):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {eligible.map((m) => {
                const isSelected = m.id === memberBId;
                return (
                  <Pressable
                    key={`b-${m.id}`}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setMemberBId(m.id);
                    }}
                    style={[
                      styles.memberPill,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.bg,
                        borderColor: colors.line,
                        borderRadius: radii.pill,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.memberPillText,
                        {
                          color: isSelected ? colors.onAccent : colors.muted,
                          fontFamily: typography.bodySemiBoldFont,
                        },
                      ]}>
                      #{m.payout_round} {m.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Swap Preview Card */}
            {memberA && memberB && memberA.id !== memberB.id && (
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: colors.bg,
                    borderRadius: radii.card,
                    borderColor: colors.line,
                    borderWidth: 1,
                    padding: spacing.md,
                    marginVertical: spacing.md,
                  },
                ]}>
                <Text
                  style={[
                    styles.previewHeader,
                    { color: colors.muted, fontFamily: typography.bodyMediumFont },
                  ]}>
                  Result of swap:
                </Text>
                <Text
                  style={[
                    styles.previewLine,
                    { color: colors.ink, fontFamily: typography.bodyFont },
                  ]}>
                  • {memberA.name} moves to <Text style={{ fontWeight: 'bold' }}>Round #{memberB.payout_round}</Text>
                </Text>
                <Text
                  style={[
                    styles.previewLine,
                    { color: colors.ink, fontFamily: typography.bodyFont },
                  ]}>
                  • {memberB.name} moves to <Text style={{ fontWeight: 'bold' }}>Round #{memberA.payout_round}</Text>
                </Text>
              </View>
            )}

            {/* Reason Input */}
            <Text
              style={[
                styles.fieldLabel,
                { color: colors.muted, fontFamily: typography.bodyMediumFont, marginTop: spacing.sm },
              ]}>
              Reason for swap (mandatory):
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Member emergency / School fees deadline"
              placeholderTextColor={colors.muted}
              style={[
                styles.reasonInput,
                {
                  backgroundColor: colors.bg,
                  color: colors.ink,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  fontFamily: typography.bodyFont,
                },
              ]}
            />

            {/* Action Button */}
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label="Confirm and execute swap"
                variant="primary"
                disabled={isSwapping}
                onPress={handleExecuteSwap}
                style={{ width: '100%' }}
              />
            </View>
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
  title: {
    fontSize: 20,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  pillScroll: {
    flexDirection: 'row',
  },
  memberPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  memberPillText: {
    fontSize: 13,
  },
  previewCard: {
    width: '100%',
  },
  previewHeader: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  previewLine: {
    fontSize: 13,
    lineHeight: 20,
  },
  reasonInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
  },
});
