import { Linking, Share, Alert } from 'react-native';

export type ReminderTone = 'friendly' | 'firm' | 'urgent';

export interface ReminderParams {
  tone: ReminderTone;
  memberName: string;
  groupName: string;
  roundNumber: number;
  amountDue: string; // formatted naira string e.g. "₦20,000"
  dueDate?: string;
  collectorName: string;
}

export interface ReceiptParams {
  memberName: string;
  groupName: string;
  roundNumber: number;
  amountPaid: string;
  collectorName: string;
  date?: string;
}

export interface GroupSummaryParams {
  groupName: string;
  roundNumber: number;
  totalRounds: number;
  collectorName: string;
  targetPot: string;
  collectedPot: string;
  paidMembers: string[];
  unpaidMembers: { name: string; due: string }[];
  nextCollectorName?: string;
}

/**
 * Generate personal contribution reminder text with three distinct tones.
 */
export function buildReminderMessage({
  tone,
  memberName,
  groupName,
  roundNumber,
  amountDue,
  dueDate,
  collectorName,
}: ReminderParams): string {
  const dateStr = dueDate ? ` on or before ${dueDate}` : ' soon';

  switch (tone) {
    case 'friendly':
      return `Good day ${memberName}! 👋\n\nThis is a friendly reminder that your contribution of ${amountDue} for "${groupName}" (Round ${roundNumber}) is due${dateStr}.\n\nPayout this round goes to ${collectorName}.\n\nThank you for keeping our Ajo cycle strong! 🙏\n— Yípo Record Book`;

    case 'firm':
      return `Hello ${memberName}.\n\nPlease be reminded that your ${amountDue} contribution for "${groupName}" Round ${roundNumber} is now required${dateStr}.\n\nOur collector ${collectorName} is scheduled to receive the full pot on time. Kindly arrange payment today.\n\nThank you for your cooperation.\n— Yípo Record Book`;

    case 'urgent':
      return `⚠️ URGENT NOTICE: ${memberName}\n\nYour contribution of ${amountDue} for "${groupName}" (Round ${roundNumber}) is overdue.\n\nThe group payout to ${collectorName} cannot be completed without your share. Please send your payment immediately to maintain trust in the circle.\n\nThank you.\n— Yípo Record Book`;
  }
}

/**
 * Generate payment receipt confirmation text.
 */
export function buildReceiptMessage({
  memberName,
  groupName,
  roundNumber,
  amountPaid,
  collectorName,
  date,
}: ReceiptParams): string {
  const dateStr = date ? `\nDate: ${date}` : '';
  return `🧾 *Ajo Payment Receipt*\n\nGroup: *${groupName}*\nRound: *${roundNumber}*\nMember: *${memberName}*\nAmount Received: *${amountPaid}*${dateStr}\nCollector: *${collectorName}*\nStatus: *CONFIRMED PAID* ✅\n\nThank you for your timely contribution!\n— Recorded via Yípo`;
}

/**
 * Generate full group round summary for WhatsApp group chat.
 */
export function buildGroupSummaryMessage({
  groupName,
  roundNumber,
  totalRounds,
  collectorName,
  targetPot,
  collectedPot,
  paidMembers,
  unpaidMembers,
  nextCollectorName,
}: GroupSummaryParams): string {
  const paidSection =
    paidMembers.length > 0
      ? paidMembers.map((m) => `  ✅ ${m}`).join('\n')
      : '  (None yet)';

  const unpaidSection =
    unpaidMembers.length > 0
      ? unpaidMembers.map((m) => `  ⏳ ${m.name} (${m.due})`).join('\n')
      : '  🎉 All members paid!';

  let nextSection = '';
  if (nextCollectorName) {
    nextSection = `\n🔮 *Next Collector:* ${nextCollectorName}\n`;
  }

  return `📊 *${groupName.toUpperCase()} — ROUND ${roundNumber} OF ${totalRounds} SUMMARY*\n\n` +
    `👤 *Round Collector:* ${collectorName}\n` +
    `💰 *Pot Target:* ${targetPot}\n` +
    `📥 *Collected So Far:* ${collectedPot}\n\n` +
    `*Paid Members (${paidMembers.length}):*\n${paidSection}\n\n` +
    `*Pending (${unpaidMembers.length}):*\n${unpaidSection}\n` +
    nextSection +
    `\n— Recorded offline with Yípo Record Book`;
}

/**
 * Open WhatsApp directly to a specific phone number with prefilled message,
 * or fall back gracefully to system share sheet.
 */
export async function sendWhatsAppOrShare(
  phone: string | null | undefined,
  text: string
): Promise<void> {
  const cleanPhone = phone?.replace(/[^0-9]/g, '');

  if (cleanPhone && cleanPhone.length >= 10) {
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(waUrl).catch(() => false);

    if (canOpen) {
      await Linking.openURL(waUrl);
      return;
    }
  }

  // Fallback to system share sheet
  try {
    await Share.share({
      message: text,
      title: 'Ajo Reminder / Receipt',
    });
  } catch (err: unknown) {
    Alert.alert('Share Error', err instanceof Error ? err.message : 'Unable to share message');
  }
}
