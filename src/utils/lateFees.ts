import { GroupRecord } from '@/db/schema';

export interface LateFeeCalculation {
  isLate: boolean;
  daysLate: number;
  amount: number;
  notice: string;
}

/**
 * Calculate late fee for a payment based on the group's policy, round due date, and payment timestamp.
 * - Applies once per member per round.
 * - Rounds percentage fees to the nearest whole Naira.
 * - Respects the grace period in days.
 */
export function computeLateFee(
  group: Pick<GroupRecord, 'late_fee_type' | 'late_fee_value' | 'late_fee_grace_days' | 'contribution_amount'>,
  dueDateISO: string,
  paidAtISO: string = new Date().toISOString()
): LateFeeCalculation {
  const type = group.late_fee_type || 'none';
  const value = group.late_fee_value || 0;
  const graceDays = group.late_fee_grace_days || 0;

  if (type === 'none' || value <= 0) {
    return { isLate: false, daysLate: 0, amount: 0, notice: '' };
  }

  const dueDate = new Date(dueDateISO);
  const graceEnd = new Date(dueDate.getTime() + graceDays * 86400000);
  const paidDate = new Date(paidAtISO);

  if (paidDate.getTime() <= graceEnd.getTime()) {
    return { isLate: false, daysLate: 0, amount: 0, notice: '' };
  }

  const diffMs = paidDate.getTime() - graceEnd.getTime();
  const daysLate = Math.max(1, Math.ceil(diffMs / 86400000));

  let amount = 0;
  if (type === 'fixed') {
    amount = Math.round(value);
  } else if (type === 'percentage') {
    amount = Math.round((group.contribution_amount * value) / 100);
  }

  const notice = `Late fee: ₦${amount.toLocaleString()}. Paid ${daysLate} day${
    daysLate === 1 ? '' : 's'
  } after the grace period ended.`;

  return {
    isLate: true,
    daysLate,
    amount,
    notice,
  };
}

/**
 * Format the late fee notice for display in the UI and statements.
 */
export function formatLateFeeNotice(
  amount: number,
  daysLate: number,
  waived: boolean = false,
  waivedReason?: string | null
): string {
  if (amount <= 0) return '';
  if (waived) {
    return `Late fee: ₦${amount.toLocaleString()} (Waived: ${waivedReason || 'Organizer waiver'})`;
  }
  const dayStr = `${daysLate} day${daysLate === 1 ? '' : 's'}`;
  return `Late fee: ₦${amount.toLocaleString()}. Paid ${dayStr} after the grace period ended.`;
}
