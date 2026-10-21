import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { Button } from '@/components/ui/button';
import { PlusBadge } from '@/utils/plus';
import { CheckIcon } from '@/components/ui/icons';
import {
  getUnpaidReminderQueue,
  setPaymentReminded,
  clearPaymentReminded,
  ReminderQueueItem,
} from '@/db/queries';
import {
  ReminderTone,
  buildReminderMessage,
  sendWhatsAppOrShare,
} from '@/utils/whatsapp';
import { formatLateFeeNotice } from '@/utils/lateFees';

export default function BulkRemindersScreen() {
  const params = useLocalSearchParams<{ groupId?: string }>();
  const { colors, typography, spacing, radii, isDark, formatNaira } = useTheme();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReminderQueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reminded'>('pending');
  const [selectedTone, setSelectedTone] = useState<ReminderTone>('friendly');
  const [sendingPaymentId, setSendingPaymentId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const data = await getUnpaidReminderQueue(params.groupId);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [params.groupId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getUnpaidReminderQueue(params.groupId);
        if (isMounted) setItems(data);
      } catch {
        if (isMounted) setItems([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [params.groupId]);

  const pendingItems = items.filter((i) => !i.remindedAt);
  const remindedItems = items.filter((i) => !!i.remindedAt);

  const handleSendReminder = async (item: ReminderQueueItem) => {
    setSendingPaymentId(item.paymentId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let feeNotice: string | undefined;
    if (item.lateFeeAmount > 0) {
      feeNotice = formatLateFeeNotice(
        item.lateFeeAmount,
        1,
        item.lateFeeWaived,
        item.lateFeeWaivedReason
      );
    }

    const message = buildReminderMessage({
      tone: selectedTone,
      memberName: item.memberName,
      groupName: item.groupName,
      roundNumber: item.roundNumber,
      amountDue: formatNaira(item.remainingDue),
      dueDate: item.dueDate
        ? new Date(item.dueDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })
        : undefined,
      collectorName: item.collectorName,
      lateFeeNotice: feeNotice,
    });

    try {
      const success = await sendWhatsAppOrShare(item.memberPhone, message);
      if (success) {
        await setPaymentReminded(item.paymentId);
        // Refresh local list
        await loadQueue();
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to send reminder');
    } finally {
      setSendingPaymentId(null);
    }
  };

  const handleBackToPending = async (paymentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await clearPaymentReminded(paymentId);
      await loadQueue();
    } catch {
      Alert.alert('Error', 'Unable to move back to pending');
    }
  };

  const formatHonestStatus = (isoString?: string | null): string => {
    if (!isoString) return 'Opened in WhatsApp';
    try {
      const date = new Date(isoString);
      const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      return `Opened in WhatsApp, ${timeStr}`;
    } catch {
      return 'Opened in WhatsApp';
    }
  };

  return (
    <ResponsiveContainer>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: spacing.base, paddingBottom: spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: colors.line }]}>
            <Text style={[styles.backBtnText, { color: colors.ink }]}>←</Text>
          </Pressable>

          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text
                style={[
                  styles.title,
                  { color: colors.ink, fontFamily: typography.headingFont },
                ]}>
                Bulk Reminders
              </Text>
              <PlusBadge />
            </View>
            <Text
              style={[
                styles.subtitle,
                { color: colors.muted, fontFamily: typography.bodyFont },
              ]}>
              Open reminders directly in WhatsApp
            </Text>
          </View>
        </View>

        {/* Tone Selector */}
        <View
          style={[
            styles.toneCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              borderRadius: radii.card,
              borderWidth: 1,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}>
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.muted, fontFamily: typography.bodyMediumFont },
            ]}>
            MESSAGE TONE:
          </Text>

          <View style={[styles.toneRow, { marginTop: spacing.xs }]}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedTone('friendly');
              }}
              style={[
                styles.toneChip,
                {
                  backgroundColor:
                    selectedTone === 'friendly' ? colors.accent : colors.bg,
                  borderColor:
                    selectedTone === 'friendly' ? colors.accent : colors.line,
                  borderRadius: radii.pill,
                },
              ]}>
              <Text
                style={[
                  styles.toneChipText,
                  {
                    color:
                      selectedTone === 'friendly' ? colors.onAccent : colors.muted,
                    fontFamily: typography.bodySemiBoldFont,
                    fontWeight: selectedTone === 'friendly' ? '700' : '500',
                  },
                ]}>
                Friendly
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedTone('firm');
              }}
              style={[
                styles.toneChip,
                {
                  backgroundColor:
                    selectedTone === 'firm'
                      ? isDark
                        ? 'rgba(245, 158, 11, 0.25)'
                        : '#FEF3C7'
                      : colors.bg,
                  borderColor:
                    selectedTone === 'firm' ? colors.accent : colors.line,
                  borderRadius: radii.pill,
                  marginHorizontal: spacing.xs,
                },
              ]}>
              <Text
                style={[
                  styles.toneChipText,
                  {
                    color:
                      selectedTone === 'firm' ? colors.accentText : colors.muted,
                    fontFamily: typography.bodySemiBoldFont,
                  },
                ]}>
                Firm
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedTone('last_notice');
              }}
              style={[
                styles.toneChip,
                {
                  backgroundColor:
                    selectedTone === 'last_notice'
                      ? isDark
                        ? 'rgba(224, 78, 67, 0.25)'
                        : '#FEE2E2'
                      : colors.bg,
                  borderColor:
                    selectedTone === 'last_notice' ? colors.unpaid : colors.line,
                  borderRadius: radii.pill,
                },
              ]}>
              <Text
                style={[
                  styles.toneChipText,
                  {
                    color:
                      selectedTone === 'last_notice' ? colors.unpaid : colors.muted,
                    fontFamily: typography.bodySemiBoldFont,
                  },
                ]}>
                Last notice
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Controls */}
        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: colors.bg, borderRadius: radii.pill },
          ]}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('pending');
            }}
            style={[
              styles.tab,
              activeTab === 'pending' && [
                styles.activeTab,
                { backgroundColor: colors.surface, borderRadius: radii.pill },
              ],
            ]}>
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'pending' ? colors.ink : colors.muted,
                  fontFamily: typography.bodySemiBoldFont,
                },
              ]}>
              Pending ({pendingItems.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('reminded');
            }}
            style={[
              styles.tab,
              activeTab === 'reminded' && [
                styles.activeTab,
                { backgroundColor: colors.surface, borderRadius: radii.pill },
              ],
            ]}>
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'reminded' ? colors.ink : colors.muted,
                  fontFamily: typography.bodySemiBoldFont,
                },
              ]}>
              Reminded ({remindedItems.length})
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : activeTab === 'pending' ? (
          pendingItems.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  borderWidth: 1,
                  padding: spacing.xl,
                  marginTop: spacing.md,
                },
              ]}>
              <View
                style={[
                  styles.emptyCircle,
                  { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' },
                ]}>
                <CheckIcon size={24} color={colors.paid} strokeWidth={2.5} />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.ink, fontFamily: typography.headingFont },
                ]}>
                No one left to remind.
              </Text>
              <Text
                style={[
                  styles.emptySub,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Everyone is either paid or already reminded.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              {pendingItems.map((item) => {
                const isPart = item.status === 'part_paid';
                return (
                  <View
                    key={item.paymentId}
                    style={[
                      styles.itemCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.line,
                        borderRadius: radii.card,
                        borderWidth: 1,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                      },
                    ]}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text
                          style={[
                            styles.itemName,
                            { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
                          ]}>
                          {item.memberName}
                        </Text>
                        <Text
                          style={[
                            styles.itemMeta,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          {item.groupName} • Round {item.roundNumber} • {item.formattedPhone}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.itemAmount,
                            {
                              color: isPart ? '#E07A5F' : colors.unpaid,
                              fontFamily: typography.headingFont,
                            },
                          ]}>
                          {formatNaira(item.remainingDue)}
                        </Text>
                        <Text
                          style={[
                            styles.itemStatusTag,
                            { color: colors.muted, fontFamily: typography.bodyFont },
                          ]}>
                          {isPart ? 'Remaining' : 'Unpaid'}
                        </Text>
                      </View>
                    </View>

                    {item.lateFeeAmount > 0 && (
                      <View
                        style={[
                          styles.lateFeeTag,
                          {
                            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                            borderRadius: radii.card,
                            padding: spacing.xs + 2,
                            marginTop: spacing.xs,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.lateFeeTagText,
                            { color: colors.accentText, fontFamily: typography.bodyFont },
                          ]}>
                          Late fee: {formatNaira(item.lateFeeAmount)} (kept separate)
                        </Text>
                      </View>
                    )}

                    <View style={{ marginTop: spacing.sm }}>
                      <Button
                        label={sendingPaymentId === item.paymentId ? 'Opening...' : 'Send'}
                        variant="primary"
                        disabled={sendingPaymentId === item.paymentId}
                        onPress={() => handleSendReminder(item)}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* Reminded Tab */
          remindedItems.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  borderRadius: radii.card,
                  borderWidth: 1,
                  padding: spacing.xl,
                  marginTop: spacing.md,
                },
              ]}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.ink, fontFamily: typography.headingFont },
                ]}>
                No reminders sent yet
              </Text>
              <Text
                style={[
                  styles.emptySub,
                  { color: colors.muted, fontFamily: typography.bodyFont },
                ]}>
                Pending reminders you open in WhatsApp will appear here.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              {remindedItems.map((item) => (
                <View
                  key={item.paymentId}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line,
                      borderRadius: radii.card,
                      borderWidth: 1,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}>
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text
                        style={[
                          styles.itemName,
                          { color: colors.ink, fontFamily: typography.headingSemiBoldFont },
                        ]}>
                        {item.memberName}
                      </Text>
                      <Text
                        style={[
                          styles.itemMeta,
                          { color: colors.muted, fontFamily: typography.bodyFont },
                        ]}>
                        {item.groupName} • Round {item.roundNumber}
                      </Text>
                      <Text
                        style={[
                          styles.honestStatus,
                          { color: colors.accentText, fontFamily: typography.bodyMediumFont },
                        ]}>
                        {formatHonestStatus(item.remindedAt)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.itemAmount,
                          { color: colors.ink, fontFamily: typography.headingFont },
                        ]}>
                        {formatNaira(item.remainingDue)}
                      </Text>
                      <Pressable
                        onPress={() => handleBackToPending(item.paymentId)}
                        style={{
                          marginTop: spacing.xs,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          borderRadius: radii.pill,
                          backgroundColor: colors.bg,
                          borderWidth: 1,
                          borderColor: colors.line,
                        }}>
                        <Text
                          style={[
                            styles.backToPendingText,
                            { color: colors.ink, fontFamily: typography.bodySemiBoldFont },
                          ]}>
                          Back to Pending
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  toneCard: {},
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  toneRow: {
    flexDirection: 'row',
  },
  toneChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toneChipText: {
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {},
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  honestStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  itemAmount: {
    fontSize: 17,
  },
  itemStatusTag: {
    fontSize: 11,
    marginTop: 2,
  },
  lateFeeTag: {
    alignSelf: 'flex-start',
  },
  lateFeeTagText: {
    fontSize: 11,
  },
  backToPendingText: {
    fontSize: 11,
  },
});
