import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { Button } from '@/components/ui/button';
import { normalizeNigerianPhone, formatPhoneForDisplay } from '@/utils/phone';
import { createGroup } from '@/db/queries';
import { DrawOrderModal, DraftMember } from '@/components/ring/DrawOrderModal';
import { Frequency } from '@/db/schema';

export default function NewGroupScreen() {
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  // Step state: 1 = Group Info, 2 = Members, 3 = Turn Order
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 fields
  const [groupName, setGroupName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');

  // Step 2 fields
  const [members, setMembers] = useState<DraftMember[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [currentPhone, setCurrentPhone] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Step 3 draw modal
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Validation for Step 1
  const handleNextToMembers = () => {
    setFormError(null);
    const trimmed = groupName.trim();
    if (!trimmed) {
      setFormError('Please enter a group name.');
      return;
    }
    const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Contribution amount must be greater than ₦0.');
      return;
    }
    setStep(2);
  };

  // Add Member
  const handleAddMember = () => {
    setFormError(null);
    const nameTrimmed = currentName.trim();
    if (!nameTrimmed) {
      setFormError('Member name cannot be empty.');
      return;
    }

    const normalizedPhone = normalizeNigerianPhone(currentPhone);
    if (!normalizedPhone) {
      setFormError('Enter a valid Nigerian phone number (e.g. 0803 123 4567).');
      return;
    }

    // Check duplicates
    const duplicateName = members.some(
      (m) => m.name.toLowerCase() === nameTrimmed.toLowerCase()
    );
    if (duplicateName) {
      setFormError(`A member named "${nameTrimmed}" is already in this group.`);
      return;
    }

    const duplicatePhone = members.some((m) => m.phone === normalizedPhone);
    if (duplicatePhone) {
      setFormError('This phone number is already added for another member.');
      return;
    }

    const newMember: DraftMember = {
      tempId: Crypto.randomUUID(),
      name: nameTrimmed,
      phone: normalizedPhone,
      formatted_phone: formatPhoneForDisplay(normalizedPhone),
      note: currentNote.trim() || undefined,
      turn_order: members.length + 1,
    };

    setMembers([...members, newMember]);
    setCurrentName('');
    setCurrentPhone('');
    setCurrentNote('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveMember = (tempId: string) => {
    const filtered = members.filter((m) => m.tempId !== tempId);
    const reindexed = filtered.map((m, idx) => ({
      ...m,
      turn_order: idx + 1,
    }));
    setMembers(reindexed);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Reordering in Step 3
  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= members.length) return;

    const updated = [...members];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    const reordered = updated.map((m, idx) => ({
      ...m,
      turn_order: idx + 1,
    }));
    setMembers(reordered);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Final Save
  const handleFinalSave = async () => {
    if (members.length < 2) {
      Alert.alert('Members needed', 'An ajo group requires at least 2 members.');
      return;
    }

    setIsSaving(true);
    try {
      const amount = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
      const groupId = await createGroup({
        name: groupName.trim(),
        contribution_amount: amount,
        frequency,
        start_date: new Date().toISOString(),
        members: members.map((m) => ({
          name: m.name,
          phone: m.phone,
          formatted_phone: m.formatted_phone,
          note: m.note,
          turn_order: m.turn_order,
        })),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate to the round screen for this group
      router.replace(`/group/${groupId}`);
    } catch {
      Alert.alert('Error saving group', 'Failed to save group to local records. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ResponsiveContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.header, { marginVertical: spacing.lg }]}>
            <Pressable
              onPress={() => {
                if (step === 1) router.back();
                else setStep((prev) => (prev - 1) as 1 | 2 | 3);
              }}
              style={styles.backButton}>
              <Text
                style={[
                  styles.backText,
                  { color: colors.accent, fontFamily: typography.bodyMediumFont },
                ]}>
                ← Back
              </Text>
            </Pressable>

            <Text
              style={[
                styles.title,
                { color: colors.ink, fontFamily: typography.headingFont },
              ]}>
              {step === 1 && 'New Ajo Group'}
              {step === 2 && 'Add Members'}
              {step === 3 && 'Turn Order'}
            </Text>

            {/* Step Indicators */}
            <View style={styles.stepIndicatorRow}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepBar,
                    {
                      backgroundColor: s <= step ? colors.accent : colors.line,
                      borderRadius: radii.pill,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Form Error Message */}
          {formError && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.unpaid + '18',
                  borderColor: colors.unpaid,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginBottom: spacing.base,
                },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  { color: colors.unpaid, fontFamily: typography.bodyMediumFont },
                ]}>
                {formError}
              </Text>
            </View>
          )}

          {/* STEP 1: GROUP DETAILS */}
          {step === 1 && (
            <View>
              {/* Group Name */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.ink, fontFamily: typography.bodyMediumFont },
                  ]}>
                  Group name
                </Text>
                <TextInput
                  placeholder="e.g. Balogun Friday Savings"
                  placeholderTextColor={colors.muted}
                  value={groupName}
                  onChangeText={(val) => {
                    setGroupName(val);
                    setFormError(null);
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                      color: colors.ink,
                      borderRadius: radii.card,
                      fontFamily: typography.bodyFont,
                      padding: spacing.base,
                    },
                  ]}
                />
              </View>

              {/* Contribution Amount */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.ink, fontFamily: typography.bodyMediumFont },
                  ]}>
                  Contribution amount per member
                </Text>
                <TextInput
                  placeholder="e.g. 20000"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  value={amountStr}
                  onChangeText={(val) => {
                    setAmountStr(val);
                    setFormError(null);
                  }}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                      color: colors.ink,
                      borderRadius: radii.card,
                      fontFamily: typography.headingSemiBoldFont,
                      fontSize: 18,
                      padding: spacing.base,
                    },
                  ]}
                />
                {amountStr ? (
                  <Text
                    style={[
                      styles.previewText,
                      { color: colors.muted, fontFamily: typography.bodyFont, marginTop: 4 },
                    ]}>
                    Formatted: {formatNaira(parseInt(amountStr.replace(/[^0-9]/g, '') || '0', 10))}
                  </Text>
                ) : null}
              </View>

              {/* Frequency */}
              <View style={{ marginBottom: spacing.xl }}>
                <Text
                  style={[
                    styles.label,
                    { color: colors.ink, fontFamily: typography.bodyMediumFont },
                  ]}>
                  Frequency
                </Text>
                <View style={styles.freqRow}>
                  {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => {
                    const isSelected = frequency === f;
                    return (
                      <Pressable
                        key={f}
                        onPress={() => setFrequency(f)}
                        style={[
                          styles.freqPill,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.surface,
                            borderColor: isSelected ? colors.accent : colors.line,
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            paddingVertical: spacing.md,
                            paddingHorizontal: spacing.base,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.freqText,
                            {
                              color: isSelected ? colors.ink : colors.muted,
                              fontFamily: isSelected
                                ? typography.headingSemiBoldFont
                                : typography.bodyFont,
                              textTransform: 'capitalize',
                            },
                          ]}>
                          {f}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button label="Next: Add members →" onPress={handleNextToMembers} />
            </View>
          )}

          {/* STEP 2: ADD MEMBERS */}
          {step === 2 && (
            <View>
              {/* Add member card */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                    borderWidth: isDark ? 1 : 0,
                    padding: spacing.base,
                    marginBottom: spacing.lg,
                  },
                ]}>
                <Text
                  style={[
                    styles.cardHeaderTitle,
                    { color: colors.ink, fontFamily: typography.headingSemiBoldFont, marginBottom: spacing.sm },
                  ]}>
                  New Member #{members.length + 1}
                </Text>

                <TextInput
                  placeholder="Full name"
                  placeholderTextColor={colors.muted}
                  value={currentName}
                  onChangeText={setCurrentName}
                  style={[
                    styles.memberInput,
                    {
                      backgroundColor: colors.bg,
                      color: colors.ink,
                      borderRadius: radii.sm,
                      fontFamily: typography.bodyFont,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                />

                <TextInput
                  placeholder="Phone (e.g. 0803 123 4567)"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  value={currentPhone}
                  onChangeText={setCurrentPhone}
                  style={[
                    styles.memberInput,
                    {
                      backgroundColor: colors.bg,
                      color: colors.ink,
                      borderRadius: radii.sm,
                      fontFamily: typography.bodyFont,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                />

                <TextInput
                  placeholder="Note (optional)"
                  placeholderTextColor={colors.muted}
                  value={currentNote}
                  onChangeText={setCurrentNote}
                  style={[
                    styles.memberInput,
                    {
                      backgroundColor: colors.bg,
                      color: colors.ink,
                      borderRadius: radii.sm,
                      fontFamily: typography.bodyFont,
                      padding: spacing.md,
                      marginBottom: spacing.md,
                    },
                  ]}
                />

                <Button label="+ Add member" onPress={handleAddMember} variant="secondary" />
              </View>

              {/* Members Added List */}
              <View style={{ marginBottom: spacing.xl }}>
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: colors.muted, fontFamily: typography.bodyMediumFont, marginBottom: spacing.sm },
                  ]}>
                  Group members ({members.length})
                </Text>

                {members.length === 0 ? (
                  <Text
                    style={[
                      styles.emptyNote,
                      { color: colors.muted, fontFamily: typography.bodyFont },
                    ]}>
                    No members added yet. Add at least 2 members to proceed.
                  </Text>
                ) : (
                  members.map((m, index) => (
                    <View
                      key={m.tempId}
                      style={[
                        styles.memberRow,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.line,
                          borderWidth: isDark ? 1 : 0,
                          borderRadius: radii.card,
                          padding: spacing.md,
                          marginBottom: spacing.sm,
                        },
                      ]}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.memberNameText,
                            { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                          ]}>
                          {index + 1}. {m.name}
                        </Text>
                        <Text
                          style={[
                            styles.memberPhoneText,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          {m.formatted_phone} {m.note ? `• ${m.note}` : ''}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleRemoveMember(m.tempId)}
                        style={styles.removeButton}>
                        <Text style={{ color: colors.unpaid, fontSize: 13, fontWeight: '600' }}>
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>

              <Button
                label={`Next: Set Turn Order (${members.length}) →`}
                onPress={() => {
                  if (members.length < 2) {
                    setFormError('Please add at least 2 members.');
                    return;
                  }
                  setFormError(null);
                  setStep(3);
                }}
                disabled={members.length < 2}
              />
            </View>
          )}

          {/* STEP 3: TURN ORDER & DRAW */}
          {step === 3 && (
            <View>
              {/* Order explanation */}
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                    borderWidth: isDark ? 1 : 0,
                    padding: spacing.base,
                    marginBottom: spacing.lg,
                  },
                ]}>
                <Text
                  style={[
                    styles.cardHeaderTitle,
                    { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
                  ]}>
                  Payout Order
                </Text>
                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: colors.muted, fontFamily: typography.bodyFont, marginTop: 4 },
                  ]}>
                  Member #1 collects first in Round 1. Move turns manually, or let the Skia wheel
                  draw random positions for everyone.
                </Text>

                <View style={{ marginTop: spacing.md }}>
                  <Button
                    label="🎲 Spin / Draw Order"
                    onPress={() => setIsDrawModalOpen(true)}
                  />
                </View>
              </View>

              {/* Order List */}
              <View style={{ marginBottom: spacing.xl }}>
                {members.map((m, index) => {
                  const isFirst = index === 0;
                  const isLast = index === members.length - 1;

                  return (
                    <View
                      key={m.tempId}
                      style={[
                        styles.orderRow,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.line,
                          borderRadius: radii.card,
                          borderWidth: isDark ? 1 : 0,
                          padding: spacing.md,
                          marginBottom: spacing.sm,
                        },
                      ]}>
                      <View
                        style={[
                          styles.turnBadge,
                          {
                            backgroundColor: isFirst ? colors.accent : colors.bg,
                            borderRadius: radii.pill,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.turnNumber,
                            {
                              color: colors.ink,
                              fontFamily: typography.headingSemiBoldFont,
                            },
                          ]}>
                          #{index + 1}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Text
                          style={[
                            styles.memberNameText,
                            { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                          ]}>
                          {m.name}
                        </Text>
                        <Text
                          style={[
                            styles.memberPhoneText,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          Collects Round {index + 1}
                        </Text>
                      </View>

                      {/* Manual Reorder Buttons */}
                      <View style={styles.reorderButtons}>
                        <Pressable
                          disabled={isFirst}
                          onPress={() => handleMoveOrder(index, 'up')}
                          style={[
                            styles.arrowButton,
                            { opacity: isFirst ? 0.2 : 1, backgroundColor: colors.bg },
                          ]}>
                          <Text style={{ color: colors.ink, fontWeight: 'bold' }}>▲</Text>
                        </Pressable>
                        <Pressable
                          disabled={isLast}
                          onPress={() => handleMoveOrder(index, 'down')}
                          style={[
                            styles.arrowButton,
                            { opacity: isLast ? 0.2 : 1, backgroundColor: colors.bg, marginTop: 4 },
                          ]}>
                          <Text style={{ color: colors.ink, fontWeight: 'bold' }}>▼</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Button
                label={isSaving ? 'Creating group...' : '✓ Finish & Create Group'}
                onPress={handleFinalSave}
                disabled={isSaving}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Draw Order Animated Modal */}
      <DrawOrderModal
        visible={isDrawModalOpen}
        members={members}
        onClose={() => setIsDrawModalOpen(false)}
        onApplyOrder={(reordered) => setMembers(reordered)}
      />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 15,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  stepBar: {
    flex: 1,
    height: 4,
  },
  errorBox: {
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
  },
  label: {
    fontSize: 15,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  previewText: {
    fontSize: 13,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 10,
  },
  freqPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqText: {
    fontSize: 14,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontSize: 17,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  memberInput: {
    fontSize: 15,
  },
  sectionHeader: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyNote: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberNameText: {
    fontSize: 16,
  },
  memberPhoneText: {
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turnBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnNumber: {
    fontSize: 14,
  },
  reorderButtons: {
    marginLeft: 8,
  },
  arrowButton: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
