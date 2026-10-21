import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts/legacy';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { normalizeNigerianPhone, formatPhoneForDisplay } from '@/utils/phone';
import { DraftMember } from '@/components/ring/DrawOrderModal';

interface PickContactsModalProps {
  visible: boolean;
  onClose: () => void;
  onAddMembers: (members: DraftMember[]) => void;
  existingCount: number;
}

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  formattedPhone: string;
}

export function PickContactsModal({
  visible,
  onClose,
  onAddMembers,
  existingCount,
}: PickContactsModalProps) {
  const { colors, typography, radii, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Request permission and load contacts when modal opens
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
          if (!isMounted) return;
          setLoading(false);
          onClose();
          Alert.alert(
            'Contacts permission',
            'You can still paste a list or type names. To turn contacts on, open your phone settings.',
            [
              { text: 'OK', style: 'cancel' },
              {
                text: 'Open settings',
                onPress: () => {
                  Linking.openSettings().catch(() => {});
                },
              },
            ]
          );
          return;
        }

        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });

        if (!isMounted) return;

        const items: ContactItem[] = [];
        if (data && Array.isArray(data)) {
          for (const c of data) {
            const name = c.name?.trim() || `${c.firstName || ''} ${c.lastName || ''}`.trim();
            if (!name) continue;

            let rawPhone = '';
            if (c.phoneNumbers && c.phoneNumbers.length > 0) {
              rawPhone = c.phoneNumbers[0].number || '';
            }

            const normalized = rawPhone ? normalizeNigerianPhone(rawPhone) : null;
            const formatted = normalized ? formatPhoneForDisplay(normalized) : 'No phone number';

            items.push({
              id: c.id || `contact-${items.length}`,
              name,
              phone: normalized || '',
              formattedPhone: formatted,
            });
          }
        }

        items.sort((a, b) => a.name.localeCompare(b.name));
        setContacts(items);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Contacts load error:', err);
        Alert.alert('Contacts', 'Unable to load contacts from your device.');
        onClose();
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, onClose]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [contacts, searchQuery]);

  const handleToggleSelect = (id: string) => {
    Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const handleConfirmAdd = () => {
    if (selectedCount === 0) return;

    const chosen = contacts.filter((c) => selectedIds.has(c.id));
    const draftMembers: DraftMember[] = chosen.map((c, idx) => ({
      tempId: `draft-contact-${Date.now()}-${idx}`,
      name: c.name,
      phone: c.phone,
      formatted_phone: c.formattedPhone,
      turn_order: existingCount + idx + 1,
    }));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAddMembers(draftMembers);
    setSelectedIds(new Set());
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.line,
              paddingTop: Math.max(insets.top, 16),
            },
          ]}>
          <Pressable onPress={handleClose} style={styles.headerBtn}>
            <Text style={{ color: colors.muted, fontFamily: typography.bodyMediumFont, fontSize: 15 }}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.ink, fontFamily: typography.headingSemiBoldFont }]}>
            Select contacts
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Search Input */}
        <View style={{ paddingHorizontal: spacing.base, paddingVertical: spacing.sm }}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search contacts…"
            placeholderTextColor={colors.muted}
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                color: colors.ink,
                borderRadius: radii.card,
                fontFamily: typography.bodyFont,
              },
            ]}
          />
        </View>

        {/* Contacts List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <Pressable
                  onPress={() => handleToggleSelect(item.id)}
                  style={[
                    styles.contactRow,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(245, 158, 11, 0.15)'
                          : '#FEF3C7'
                        : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.line,
                      borderRadius: radii.card,
                    },
                  ]}>
                  {/* Checkbox indicator */}
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.bg,
                        borderColor: isSelected ? colors.accent : colors.line,
                        borderRadius: radii.pill,
                      },
                    ]}>
                    {isSelected && (
                      <Text style={{ color: colors.onAccent, fontSize: 11, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: colors.ink,
                        fontFamily: typography.headingSemiBoldFont,
                        fontSize: 14,
                      }}>
                      {item.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.muted,
                        fontFamily: typography.bodyFont,
                        fontSize: 12,
                        marginTop: 2,
                      }}>
                      {item.formattedPhone}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Text style={{ color: colors.muted, fontFamily: typography.bodyFont, fontSize: 14 }}>
                  No matching contacts found.
                </Text>
              </View>
            }
          />
        )}

        {/* Bottom Floating Bar */}
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
            label={selectedCount === 1 ? 'Add 1 selected' : `Add ${selectedCount} selected`}
            variant="primary"
            disabled={selectedCount === 0}
            onPress={handleConfirmAdd}
            style={{ width: '100%' }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: 16,
  },
  searchInput: {
    height: 42,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
