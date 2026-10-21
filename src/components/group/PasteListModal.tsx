import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { normalizeNigerianPhone, formatPhoneForDisplay } from '@/utils/phone';
import { DraftMember } from '@/components/ring/DrawOrderModal';

interface PasteListModalProps {
  visible: boolean;
  onClose: () => void;
  onAddMembers: (members: DraftMember[]) => void;
  existingCount: number;
}

interface ParsedEntry {
  id: string;
  name: string;
  rawPhone: string;
  normalizedPhone: string | null;
  formattedPhone: string;
}

export function PasteListModal({
  visible,
  onClose,
  onAddMembers,
  existingCount,
}: PasteListModalProps) {
  const { colors, typography, radii, spacing } = useTheme();
  const [rawText, setRawText] = useState('');
  const [editedEntries, setEditedEntries] = useState<ParsedEntry[] | null>(null);

  // Parse lines whenever rawText changes
  const parsedEntries = useMemo<ParsedEntry[]>(() => {
    if (!rawText.trim()) return [];

    const lines = rawText.split(/\r?\n/);
    const results: ParsedEntry[] = [];

    lines.forEach((line, index) => {
      let cleaned = line.trim();
      if (!cleaned) return;

      // 1. Strip leading numbering or bullets: e.g. "1.", "1)", "(1)", "[1]", "#1", "•", "-", "*"
      cleaned = cleaned.replace(/^(\d+[\.\)\-\]]|\(\d+\)|\[\d+\]|#\d+|\•|\-|\*)\s*/, '').trim();
      if (!cleaned) return;

      // 2. Extract phone if present (after comma or trailing phone pattern)
      let name = cleaned;
      let rawPhone = '';

      // Check comma separation first: e.g. "Ada, 08031234567"
      if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        name = parts[0].trim();
        rawPhone = parts.slice(1).join(',').trim();
      } else {
        // Match trailing phone number: e.g. "Ada 08031234567"
        const phoneMatch = cleaned.match(/(\+?234\d{10}|0[789][01]\d{8}|\d{11})$/);
        if (phoneMatch) {
          rawPhone = phoneMatch[1];
          name = cleaned.slice(0, phoneMatch.index).trim();
        }
      }

      if (!name) return;

      const normalized = rawPhone ? normalizeNigerianPhone(rawPhone) : null;
      const formatted = normalized ? formatPhoneForDisplay(normalized) : 'No phone number';

      results.push({
        id: `parsed-${index}-${name}`,
        name,
        rawPhone: rawPhone || '',
        normalizedPhone: normalized,
        formattedPhone: formatted,
      });
    });

    return results;
  }, [rawText]);

  const currentList = editedEntries ?? parsedEntries;
  const count = currentList.length;

  const handleUpdateEntryName = (id: string, newName: string) => {
    const base = editedEntries ?? parsedEntries;
    setEditedEntries(
      base.map((entry) => (entry.id === id ? { ...entry, name: newName } : entry))
    );
  };

  const handleUpdateEntryPhone = (id: string, newPhone: string) => {
    const base = editedEntries ?? parsedEntries;
    const normalized = newPhone.trim() ? normalizeNigerianPhone(newPhone.trim()) : null;
    const formatted = normalized ? formatPhoneForDisplay(normalized) : 'No phone number';

    setEditedEntries(
      base.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              rawPhone: newPhone,
              normalizedPhone: normalized,
              formattedPhone: formatted,
            }
          : entry
      )
    );
  };

  const handleDeleteEntry = (id: string) => {
    const base = editedEntries ?? parsedEntries;
    setEditedEntries(base.filter((entry) => entry.id !== id));
  };

  const handleConfirmAdd = () => {
    if (count === 0) return;

    const draftMembers: DraftMember[] = currentList.map((entry, idx) => ({
      tempId: `draft-${Date.now()}-${idx}`,
      name: entry.name.trim(),
      phone: entry.normalizedPhone || '',
      formatted_phone: entry.formattedPhone,
      turn_order: existingCount + idx + 1,
    }));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAddMembers(draftMembers);
    setRawText('');
    setEditedEntries(null);
    onClose();
  };

  const handleClose = () => {
    setRawText('');
    setEditedEntries(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Pressable onPress={handleClose} style={styles.headerBtn}>
            <Text style={{ color: colors.muted, fontFamily: typography.bodyMediumFont, fontSize: 15 }}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.ink, fontFamily: typography.headingSemiBoldFont }]}>
            Paste member list
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}>
          <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 13, lineHeight: 18 }}>
            Paste names copied from WhatsApp or notes. Put one member per line, with an optional phone number after a comma or space.
          </Text>

          {/* Text Area */}
          <TextInput
            value={rawText}
            onChangeText={(text) => {
              setRawText(text);
              setEditedEntries(null); // Reset overrides on re-paste
            }}
            placeholder={'Ada, 08031234567\nBabajide, 08129876543\nChidi\nFatima 07055554444'}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={6}
            style={[
              styles.textArea,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                color: colors.ink,
                borderRadius: radii.card,
                fontFamily: typography.bodyFont,
                marginTop: spacing.sm,
              },
            ]}
          />

          {/* Preview Section */}
          <View style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
              <Text
                style={{
                  color: count > 0 ? colors.accentText : colors.muted,
                  fontFamily: typography.bodySemiBoldFont,
                  fontSize: 13,
                }}>
                {count === 0
                  ? 'No names found yet. Paste at least one name.'
                  : `Understood ${count} ${count === 1 ? 'member' : 'members'}`}
              </Text>
            </View>

            {count > 0 && (
              <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
                {currentList.map((item, idx) => (
                  <View
                    key={item.id}
                    style={[
                      styles.previewRow,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.line,
                        borderRadius: radii.card,
                      },
                    ]}>
                    <Text style={{ color: colors.muted, fontFamily: typography.headingSemiBoldFont, fontSize: 12, width: 24 }}>
                      #{idx + 1}
                    </Text>

                    <TextInput
                      value={item.name}
                      onChangeText={(val) => handleUpdateEntryName(item.id, val)}
                      placeholder="Name"
                      placeholderTextColor={colors.muted}
                      style={{
                        flex: 1,
                        color: colors.ink,
                        fontFamily: typography.headingSemiBoldFont,
                        fontSize: 14,
                        paddingVertical: 4,
                      }}
                    />

                    <TextInput
                      value={item.rawPhone}
                      onChangeText={(val) => handleUpdateEntryPhone(item.id, val)}
                      placeholder="Optional phone"
                      placeholderTextColor={colors.muted}
                      keyboardType="phone-pad"
                      style={{
                        flex: 1,
                        color: item.normalizedPhone ? colors.ink : colors.muted,
                        fontFamily: typography.bodyFont,
                        fontSize: 12,
                        paddingVertical: 4,
                        marginLeft: spacing.xs,
                      }}
                    />

                    <Pressable onPress={() => handleDeleteEntry(item.id)} style={{ padding: 6 }}>
                      <Text style={{ color: colors.unpaid, fontSize: 14 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Confirm Button */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.line,
            },
          ]}>
          <Button
            label={count === 1 ? 'Add 1 member' : `Add ${count} members`}
            variant="primary"
            disabled={count === 0}
            onPress={handleConfirmAdd}
            style={{ width: '100%' }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    paddingVertical: 4,
    width: 60,
  },
  title: {
    fontSize: 16,
  },
  textArea: {
    height: 120,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
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
