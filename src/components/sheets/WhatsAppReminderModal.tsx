import React, { useState } from 'react';
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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  ReminderTone,
  buildReminderMessage,
  sendWhatsAppOrShare,
} from '@/utils/whatsapp';

interface WhatsAppReminderModalProps {
  visible: boolean;
  memberName: string;
  phone: string;
  groupName: string;
  roundNumber: number;
  amountDue: string;
  dueDate?: string;
  collectorName: string;
  onClose: () => void;
}

export function WhatsAppReminderModal({
  visible,
  memberName,
  phone,
  groupName,
  roundNumber,
  amountDue,
  dueDate,
  collectorName,
  onClose,
}: WhatsAppReminderModalProps) {
  const { colors, typography, spacing, radii, isDark } = useTheme();

  const [tone, setTone] = useState<ReminderTone>('friendly');
  const [customText, setCustomText] = useState(() =>
    buildReminderMessage({
      tone: 'friendly',
      memberName,
      groupName,
      roundNumber,
      amountDue,
      dueDate,
      collectorName,
    })
  );

  const handleSelectTone = (newTone: ReminderTone) => {
    Haptics.selectionAsync();
    setTone(newTone);
    const newText = buildReminderMessage({
      tone: newTone,
      memberName,
      groupName,
      roundNumber,
      amountDue,
      dueDate,
      collectorName,
    });
    setCustomText(newText);
  };

  const handleSend = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await sendWhatsAppOrShare(phone, customText);
    onClose();
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
          ]}>
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
            <Text
              style={[
                styles.title,
                { color: colors.ink, fontFamily: typography.headingFont },
              ]}>
              Send WhatsApp Reminder
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              To: {memberName} ({phone})
            </Text>

            {/* Tone Selector Pills */}
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.muted, fontFamily: typography.bodyMediumFont, marginTop: spacing.md },
              ]}>
              Select Message Tone:
            </Text>
            <View style={[styles.toneRow, { marginVertical: spacing.sm }]}>
              <Pressable
                onPress={() => handleSelectTone('friendly')}
                style={[
                  styles.tonePill,
                  {
                    backgroundColor: tone === 'friendly' ? colors.accent : colors.bg,
                    borderRadius: radii.pill,
                    borderColor: colors.line,
                    borderWidth: 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.toneText,
                    {
                      color: tone === 'friendly' ? colors.ink : colors.muted,
                      fontFamily: typography.bodySemiBoldFont,
                    },
                  ]}>
                  Friendly 😊
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectTone('firm')}
                style={[
                  styles.tonePill,
                  {
                    backgroundColor: tone === 'firm' ? colors.accent : colors.bg,
                    borderRadius: radii.pill,
                    borderColor: colors.line,
                    borderWidth: 1,
                    marginHorizontal: spacing.xs,
                  },
                ]}>
                <Text
                  style={[
                    styles.toneText,
                    {
                      color: tone === 'firm' ? colors.ink : colors.muted,
                      fontFamily: typography.bodySemiBoldFont,
                    },
                  ]}>
                  Firm 📌
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectTone('urgent')}
                style={[
                  styles.tonePill,
                  {
                    backgroundColor: tone === 'urgent' ? colors.unpaid : colors.bg,
                    borderRadius: radii.pill,
                    borderColor: colors.line,
                    borderWidth: 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.toneText,
                    {
                      color: tone === 'urgent' ? '#FFFFFF' : colors.muted,
                      fontFamily: typography.bodySemiBoldFont,
                    },
                  ]}>
                  Urgent ⚠️
                </Text>
              </Pressable>
            </View>

            {/* Message Preview / Editor */}
            <Text
              style={[
                styles.sectionLabel,
                { color: colors.muted, fontFamily: typography.bodyMediumFont, marginTop: spacing.sm },
              ]}>
              Preview & Edit:
            </Text>
            <TextInput
              multiline
              value={customText}
              onChangeText={setCustomText}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.bg,
                  color: colors.ink,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  fontFamily: typography.bodyFont,
                },
              ]}
            />

            {/* Send Button */}
            <View style={{ marginTop: spacing.lg }}>
              <Button
                label="Send via WhatsApp / Share"
                variant="primary"
                onPress={handleSend}
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
  sectionLabel: {
    fontSize: 12,
  },
  toneRow: {
    flexDirection: 'row',
  },
  tonePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneText: {
    fontSize: 12,
  },
  textArea: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
});
