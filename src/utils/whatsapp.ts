import { Linking, Share, Alert } from 'react-native';

export type ReminderTone = 'friendly' | 'firm' | 'last_notice';

export interface ReminderParams {
  tone: ReminderTone;
  memberName: string;
  groupName: string;
  roundNumber: number;
  amountDue: string; // formatted naira string e.g. "₦20,000"
  dueDate?: string;
  collectorName: string;
  lateFeeNotice?: string;
}

export interface ReceiptParams {
  memberName: string;
  groupName: string;
  roundNumber: number;
  amountPaid: string;
  collectorName: string;
  date?: string;
  lateFeeNotice?: string;
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
  lateFeesSummary?: string;
}

/**
 * Generate personal contribution reminder text with three distinct tones.
 * Zero emojis in accordance with Yípo design standards.
 */
export function buildReminderMessage({
  tone,
  memberName,
  groupName,
  roundNumber,
  amountDue,
  dueDate,
  collectorName,
  lateFeeNotice,
}: ReminderParams): string {
  const dateStr = dueDate ? ` on or before ${dueDate}` : ' soon';
  const feeLine = lateFeeNotice ? `\n\n${lateFeeNotice}` : '';

  switch (tone) {
    case 'friendly':
      return (
        `Good day ${memberName}.\n\n` +
        `This is a friendly reminder that your contribution of ${amountDue} for "${groupName}" (Round ${roundNumber}) is due${dateStr}.\n\n` +
        `Payout this round goes to ${collectorName}.\n\n` +
        `Thank you for keeping our Ajo cycle strong.${feeLine}\n` +
        `— Yípo Record Book`
      );

    case 'firm':
      return (
        `Hello ${memberName}.\n\n` +
        `Please be reminded that your ${amountDue} contribution for "${groupName}" Round ${roundNumber} is now required${dateStr}.\n\n` +
        `Our collector ${collectorName} is scheduled to receive the full pot on time. Kindly arrange payment today.\n\n` +
        `Thank you for your cooperation.${feeLine}\n` +
        `— Yípo Record Book`
      );

    case 'last_notice':
      return (
        `LAST NOTICE: ${memberName}\n\n` +
        `Your contribution of ${amountDue} for "${groupName}" (Round ${roundNumber}) is overdue.\n\n` +
        `The group payout to ${collectorName} cannot be completed without your share. Please send your payment immediately to maintain trust in the circle.${feeLine}\n\n` +
        `Thank you.\n` +
        `— Yípo Record Book`
      );
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
  lateFeeNotice,
}: ReceiptParams): string {
  const dateStr = date ? `\nDate: ${date}` : '';
  const feeStr = lateFeeNotice ? `\n${lateFeeNotice}` : '';
  return (
    `*Ajo Payment Receipt*\n\n` +
    `Group: *${groupName}*\n` +
    `Round: *${roundNumber}*\n` +
    `Member: *${memberName}*\n` +
    `Amount Received: *${amountPaid}*${dateStr}\n` +
    `Collector: *${collectorName}*${feeStr}\n` +
    `Status: *CONFIRMED PAID*\n\n` +
    `Thank you for your timely contribution.\n` +
    `— Records only. Yípo does not hold or move money.`
  );
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
  lateFeesSummary,
}: GroupSummaryParams): string {
  const paidSection =
    paidMembers.length > 0
      ? paidMembers.map((m) => `  - ${m}`).join('\n')
      : '  (None yet)';

  const unpaidSection =
    unpaidMembers.length > 0
      ? unpaidMembers.map((m) => `  - ${m.name} (${m.due})`).join('\n')
      : '  (All members paid)';

  let nextSection = '';
  if (nextCollectorName) {
    nextSection = `\n*Next Collector:* ${nextCollectorName}\n`;
  }

  let lateFeeSection = '';
  if (lateFeesSummary) {
    lateFeeSection = `\n*Late fees (kept separate):* ${lateFeesSummary}\n`;
  }

  return (
    `*${groupName.toUpperCase()} — ROUND ${roundNumber} OF ${totalRounds} SUMMARY*\n\n` +
    `*Round Collector:* ${collectorName}\n` +
    `*Pot Target:* ${targetPot}\n` +
    `*Collected So Far:* ${collectedPot}\n` +
    lateFeeSection +
    `\n*Paid Members (${paidMembers.length}):*\n${paidSection}\n\n` +
    `*Pending (${unpaidMembers.length}):*\n${unpaidSection}\n` +
    nextSection +
    `\n— Records only. Yípo does not hold or move money.`
  );
}

/**
 * Open WhatsApp directly to a specific phone number with prefilled message,
 * or fall back gracefully to system share sheet.
 */
export async function sendWhatsAppOrShare(
  phone: string | null | undefined,
  text: string
): Promise<boolean> {
  const cleanPhone = phone?.replace(/[^0-9]/g, '');

  if (cleanPhone && cleanPhone.length >= 10) {
    const waUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(waUrl).catch(() => false);

    if (canOpen) {
      await Linking.openURL(waUrl);
      return true;
    }

    const webWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    const canOpenWeb = await Linking.canOpenURL(webWaUrl).catch(() => false);
    if (canOpenWeb) {
      await Linking.openURL(webWaUrl);
      return true;
    }
  }

  // Fallback to system share sheet
  try {
    await Share.share({
      message: text,
      title: 'Ajo Reminder / Receipt',
    });
    return true;
  } catch (err: unknown) {
    Alert.alert('Share Error', err instanceof Error ? err.message : 'Unable to share message');
    return false;
  }
}
