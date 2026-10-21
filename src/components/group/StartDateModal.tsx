import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';

interface StartDateModalProps {
  visible: boolean;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export function formatStartDateDisplay(d: Date): string {
  const now = new Date();
  const isSameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isSameDay) return 'Starts today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) return 'Starts tomorrow';

  return `Starts ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function StartDateModal({
  visible,
  currentDate,
  onSelectDate,
  onClose,
}: StartDateModalProps) {
  const { colors, typography, radii, spacing, isDark } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);

  const getNextMonday = (): Date => {
    const d = new Date();
    const day = d.getDay();
    const diff = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getInDays = (days: number): Date => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const presets = [
    { label: 'Starts today', date: new Date() },
    { label: 'Starts tomorrow', date: getInDays(1) },
    { label: 'Starts next Monday', date: getNextMonday() },
    { label: 'Starts in 1 week', date: getInDays(7) },
    { label: 'Starts in 1 month', date: getInDays(30) },
  ];

  const handleAdjustDays = (delta: number) => {
    Haptics.selectionAsync();
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectDate(selectedDate);
    onClose();
  };

  const isMatchingPreset = (target: Date) => {
    return (
      selectedDate.getDate() === target.getDate() &&
      selectedDate.getMonth() === target.getMonth() &&
      selectedDate.getFullYear() === target.getFullYear()
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              borderRadius: radii.card,
              borderWidth: isDark ? 1 : 0,
              padding: spacing.base,
            },
          ]}
          onPress={(e) => e.stopPropagation()}>
          <Text
            style={[
              styles.title,
              { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
            ]}>
            Choose start date
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: typography.bodyFont,
              fontSize: 13,
              marginTop: 2,
              marginBottom: spacing.md,
            }}>
            Ajo rounds and due dates are calculated from this date.
          </Text>

          {/* Preset options */}
          <View style={{ gap: 6, marginBottom: spacing.md }}>
            {presets.map((preset) => {
              const active = isMatchingPreset(preset.date);
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDate(preset.date);
                  }}
                  style={[
                    styles.presetRow,
                    {
                      backgroundColor: active
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.2)'
                          : '#FEF3C7'
                        : colors.bg,
                      borderColor: active ? colors.accent : colors.line,
                      borderRadius: radii.sm,
                    },
                  ]}>
                  <Text
                    style={{
                      color: active ? colors.accentText : colors.ink,
                      fontFamily: active ? typography.headingSemiBoldFont : typography.bodyFont,
                      fontSize: 14,
                    }}>
                    {preset.label}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontFamily: typography.bodyFont,
                      fontSize: 12,
                    }}>
                    {preset.date.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Stepper for custom adjustments */}
          <View
            style={[
              styles.stepperContainer,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                borderRadius: radii.sm,
                padding: spacing.sm,
                marginBottom: spacing.base,
              },
            ]}>
            <Text style={{ color: colors.muted, fontFamily: typography.bodyMediumFont, fontSize: 12, marginBottom: 4 }}>
              Custom date adjustment
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable
                onPress={() => handleAdjustDays(-1)}
                style={[styles.stepBtn, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.sm }]}>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: 'bold' }}>- 1 day</Text>
              </Pressable>

              <Text
                style={{
                  color: colors.ink,
                  fontFamily: typography.headingSemiBoldFont,
                  fontSize: 14,
                }}>
                {selectedDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>

              <Pressable
                onPress={() => handleAdjustDays(1)}
                style={[styles.stepBtn, { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.sm }]}>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: 'bold' }}>+ 1 day</Text>
              </Pressable>
            </View>
          </View>

          <Button label="Confirm date" variant="primary" onPress={handleConfirm} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  stepperContainer: {
    borderWidth: 1,
  },
  stepBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
});
