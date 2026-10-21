import * as Crypto from 'expo-crypto';
import { getDb } from './client';
import {
  GroupRecord,
  MemberRecord,
  RoundRecord,
  PaymentRecord,
  Frequency,
} from './schema';
import { calculateDueDates, getNowISO } from '@/utils/dates';

export interface CreateMemberInput {
  name: string;
  phone: string;
  formatted_phone: string;
  note?: string;
  turn_order: number;
}

export interface CreateGroupInput {
  name: string;
  contribution_amount: number; // integer (naira)
  frequency: Frequency;
  start_date: string; // ISO
  members: CreateMemberInput[];
}

export interface GroupSummary {
  id: string;
  name: string;
  contribution_amount: number;
  frequency: Frequency;
  current_round: number;
  total_rounds: number;
  next_collector_name: string;
  next_collector_index: number; // 0-based index for ring
  target_amount: number;
  collected_amount: number;
  outstanding_amount: number;
  members_count: number;
}

/**
 * Creates a new Ajo group atomically with all members, rounds, and initial payment slots.
 */
export async function createGroup(input: CreateGroupInput): Promise<string> {
  const db = await getDb();
  const groupId = Crypto.randomUUID();
  const now = getNowISO();
  const totalRounds = input.members.length;

  const dueDates = calculateDueDates(input.start_date, input.frequency, totalRounds);

  await db.withTransactionAsync(async () => {
    // 1. Insert Group
    await db.runAsync(
      `INSERT INTO groups (id, name, contribution_amount, frequency, start_date, total_rounds, current_round, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 'active', ?, ?);`,
      [
        groupId,
        input.name.trim(),
        input.contribution_amount,
        input.frequency,
        input.start_date,
        totalRounds,
        now,
        now,
      ]
    );

    // 2. Insert Members
    const memberIdMap = new Map<number, string>(); // turn_order -> memberId
    for (const m of input.members) {
      const memberId = Crypto.randomUUID();
      memberIdMap.set(m.turn_order, memberId);

      await db.runAsync(
        `INSERT INTO members (id, group_id, name, phone, formatted_phone, note, turn_order, payout_round, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          memberId,
          groupId,
          m.name.trim(),
          m.phone,
          m.formatted_phone,
          m.note?.trim() || null,
          m.turn_order,
          m.turn_order, // round in which they collect
          now,
        ]
      );
    }

    // 3. Insert All Rounds
    const targetPot = input.contribution_amount * totalRounds;
    const roundIds: string[] = [];

    for (let r = 1; r <= totalRounds; r++) {
      const roundId = Crypto.randomUUID();
      roundIds.push(roundId);
      const collectorId = memberIdMap.get(r)!;
      const dueDate = dueDates[r - 1] || now;

      await db.runAsync(
        `INSERT INTO rounds (id, group_id, round_number, collector_member_id, target_amount, collected_amount, due_date, status, collector_confirmed, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, 'open', 0, ?);`,
        [roundId, groupId, r, collectorId, targetPot, dueDate, now]
      );
    }

    // 4. Initialize Payment Records for Round 1
    const firstRoundId = roundIds[0];
    for (const m of input.members) {
      const memberId = memberIdMap.get(m.turn_order)!;
      const paymentId = Crypto.randomUUID();

      await db.runAsync(
        `INSERT INTO payments (id, group_id, round_id, member_id, amount, target_amount, status, created_at)
         VALUES (?, ?, ?, ?, 0, ?, 'unpaid', ?);`,
        [paymentId, groupId, firstRoundId, memberId, input.contribution_amount, now]
      );
    }
  });

  return groupId;
}

/**
 * Fetch all active groups with summary metrics for the home screen cards.
 */
export async function getGroupsSummary(): Promise<GroupSummary[]> {
  const db = await getDb();

  const groups = await db.getAllAsync<GroupRecord>(
    `SELECT * FROM groups WHERE status = 'active' ORDER BY created_at DESC;`
  );

  const summaries: GroupSummary[] = [];

  for (const group of groups) {
    // Current round info
    const round = await db.getFirstAsync<RoundRecord>(
      `SELECT * FROM rounds WHERE group_id = ? AND round_number = ?;`,
      [group.id, group.current_round]
    );

    let nextCollectorName = 'Pending';
    let collectorIndex = 0;

    if (round) {
      const collector = await db.getFirstAsync<MemberRecord>(
        `SELECT name, turn_order FROM members WHERE id = ?;`,
        [round.collector_member_id]
      );
      if (collector) {
        nextCollectorName = collector.name;
        collectorIndex = Math.max(0, collector.turn_order - 1);
      }
    }

    const targetAmount = round ? round.target_amount : group.contribution_amount * group.total_rounds;
    const collectedAmount = round ? round.collected_amount : 0;
    const outstanding = Math.max(0, targetAmount - collectedAmount);

    summaries.push({
      id: group.id,
      name: group.name,
      contribution_amount: group.contribution_amount,
      frequency: group.frequency,
      current_round: group.current_round,
      total_rounds: group.total_rounds,
      next_collector_name: nextCollectorName,
      next_collector_index: collectorIndex,
      target_amount: targetAmount,
      collected_amount: collectedAmount,
      outstanding_amount: outstanding,
      members_count: group.total_rounds,
    });
  }

  return summaries;
}

/**
 * Fetch full group details including members and rounds.
 */
export async function getGroupDetails(groupId: string): Promise<{
  group: GroupRecord;
  members: MemberRecord[];
  rounds: RoundRecord[];
  currentRound: RoundRecord | null;
  payments: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number })[];
} | null> {
  const db = await getDb();

  const group = await db.getFirstAsync<GroupRecord>(
    `SELECT * FROM groups WHERE id = ?;`,
    [groupId]
  );
  if (!group) return null;

  const members = await db.getAllAsync<MemberRecord>(
    `SELECT * FROM members WHERE group_id = ? ORDER BY turn_order ASC;`,
    [groupId]
  );

  const rounds = await db.getAllAsync<RoundRecord>(
    `SELECT * FROM rounds WHERE group_id = ? ORDER BY round_number ASC;`,
    [groupId]
  );

  const currentRound = rounds.find((r) => r.round_number === group.current_round) || null;

  let payments: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number })[] = [];
  if (currentRound) {
    payments = await db.getAllAsync<
      PaymentRecord & { member_name: string; member_phone: string; turn_order: number }
    >(
      `SELECT p.*, m.name as member_name, m.phone as member_phone, m.turn_order
       FROM payments p
       JOIN members m ON p.member_id = m.id
       WHERE p.round_id = ?
       ORDER BY m.turn_order ASC;`,
      [currentRound.id]
    );

    // If payments weren't initialized for this round yet, initialize them now
    if (payments.length === 0 && members.length > 0) {
      const now = getNowISO();
      await db.withTransactionAsync(async () => {
        for (const m of members) {
          const paymentId = Crypto.randomUUID();
          await db.runAsync(
            `INSERT INTO payments (id, group_id, round_id, member_id, amount, target_amount, status, created_at)
             VALUES (?, ?, ?, ?, 0, ?, 'unpaid', ?);`,
            [paymentId, groupId, currentRound.id, m.id, group.contribution_amount, now]
          );
        }
      });

      payments = await db.getAllAsync<
        PaymentRecord & { member_name: string; member_phone: string; turn_order: number }
      >(
        `SELECT p.*, m.name as member_name, m.phone as member_phone, m.turn_order
         FROM payments p
         JOIN members m ON p.member_id = m.id
         WHERE p.round_id = ?
         ORDER BY m.turn_order ASC;`,
        [currentRound.id]
      );
    }
  }

  return { group, members, rounds, currentRound, payments };
}

/**
 * Record or update a member's payment for the current round.
 * Atomically updates the payment row and the round's collected_amount.
 */
export async function recordPayment(input: {
  paymentId: string;
  amount: number; // integer (naira)
  status: 'unpaid' | 'part_paid' | 'paid';
  receiptImageUri?: string | null;
  note?: string | null;
}): Promise<void> {
  const db = await getDb();
  const now = getNowISO();

  await db.withTransactionAsync(async () => {
    // 1. Get current payment row to find round_id
    const currentPayment = await db.getFirstAsync<PaymentRecord>(
      `SELECT * FROM payments WHERE id = ?;`,
      [input.paymentId]
    );
    if (!currentPayment) {
      throw new Error(`Payment with id ${input.paymentId} not found`);
    }

    const paidAt = input.status === 'unpaid' ? null : now;

    // 2. Update payment row
    await db.runAsync(
      `UPDATE payments
       SET amount = ?,
           status = ?,
           paid_at = ?,
           receipt_image_uri = ?,
           note = ?
       WHERE id = ?;`,
      [
        input.amount,
        input.status,
        paidAt,
        input.receiptImageUri ?? null,
        input.note?.trim() ?? null,
        input.paymentId,
      ]
    );

    // 3. Recompute round total collected amount
    const sumResult = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(amount) as total FROM payments WHERE round_id = ?;`,
      [currentPayment.round_id]
    );
    const newCollected = sumResult?.total ?? 0;

    await db.runAsync(
      `UPDATE rounds SET collected_amount = ? WHERE id = ?;`,
      [newCollected, currentPayment.round_id]
    );
  });
}

/**
 * Advance to the next round after organizer confirms collector payout.
 * Closes the current round, marks collector_confirmed = 1, increments current_round,
 * and initializes next round payment slots.
 */
export async function advanceToNextRound(groupId: string): Promise<{
  isCompleted: boolean;
  nextRoundNumber: number;
}> {
  const db = await getDb();
  const now = getNowISO();

  let outcome = { isCompleted: false, nextRoundNumber: 1 };

  await db.withTransactionAsync(async () => {
    const group = await db.getFirstAsync<GroupRecord>(
      `SELECT * FROM groups WHERE id = ?;`,
      [groupId]
    );
    if (!group) throw new Error('Group not found');

    // 1. Mark current round as completed & confirmed
    await db.runAsync(
      `UPDATE rounds
       SET status = 'completed',
           collector_confirmed = 1,
           completed_at = ?
       WHERE group_id = ? AND round_number = ?;`,
      [now, groupId, group.current_round]
    );

    // 2. Check if this was the final round
    if (group.current_round >= group.total_rounds) {
      await db.runAsync(
        `UPDATE groups SET status = 'completed', updated_at = ? WHERE id = ?;`,
        [now, groupId]
      );
      outcome = { isCompleted: true, nextRoundNumber: group.current_round };
      return;
    }

    // 3. Otherwise, advance group to next round
    const nextRound = group.current_round + 1;
    await db.runAsync(
      `UPDATE groups SET current_round = ?, updated_at = ? WHERE id = ?;`,
      [nextRound, now, groupId]
    );

    // 4. Initialize payments for next round if not already present
    const nextRoundRecord = await db.getFirstAsync<RoundRecord>(
      `SELECT * FROM rounds WHERE group_id = ? AND round_number = ?;`,
      [groupId, nextRound]
    );

    if (nextRoundRecord) {
      const existingPayments = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM payments WHERE round_id = ?;`,
        [nextRoundRecord.id]
      );

      if (!existingPayments || existingPayments.count === 0) {
        const members = await db.getAllAsync<MemberRecord>(
          `SELECT * FROM members WHERE group_id = ? ORDER BY turn_order ASC;`,
          [groupId]
        );

        for (const m of members) {
          const paymentId = Crypto.randomUUID();
          await db.runAsync(
            `INSERT INTO payments (id, group_id, round_id, member_id, amount, target_amount, status, created_at)
             VALUES (?, ?, ?, ?, 0, ?, 'unpaid', ?);`,
            [paymentId, groupId, nextRoundRecord.id, m.id, group.contribution_amount, now]
          );
        }
      }
    }

    outcome = { isCompleted: false, nextRoundNumber: nextRound };
  });

  return outcome;
}

/**
 * Delete a group and all associated records with confirmation.
 */
export async function deleteGroup(groupId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM groups WHERE id = ?;`, [groupId]);
}

/**
 * Atomically swap turn order between two members in an Ajo group and log reason.
 */
export async function swapMemberTurns(
  groupId: string,
  memberAId: string,
  memberBId: string,
  reason: string
): Promise<void> {
  const db = await getDb();
  const now = getNowISO();
  const swapId = Crypto.randomUUID();

  await db.withTransactionAsync(async () => {
    const memberA = await db.getFirstAsync<MemberRecord>(
      `SELECT * FROM members WHERE id = ?;`,
      [memberAId]
    );
    const memberB = await db.getFirstAsync<MemberRecord>(
      `SELECT * FROM members WHERE id = ?;`,
      [memberBId]
    );

    if (!memberA || !memberB) {
      throw new Error('Both members must exist in the group');
    }

    const roundA = memberA.payout_round;
    const roundB = memberB.payout_round;

    // 1. Swap turn order and payout rounds on members
    await db.runAsync(
      `UPDATE members SET turn_order = ?, payout_round = ? WHERE id = ?;`,
      [roundB, roundB, memberAId]
    );

    await db.runAsync(
      `UPDATE members SET turn_order = ?, payout_round = ? WHERE id = ?;`,
      [roundA, roundA, memberBId]
    );

    // 2. Update collector on respective rounds
    await db.runAsync(
      `UPDATE rounds SET collector_member_id = ? WHERE group_id = ? AND round_number = ?;`,
      [memberBId, groupId, roundA]
    );

    await db.runAsync(
      `UPDATE rounds SET collector_member_id = ? WHERE group_id = ? AND round_number = ?;`,
      [memberAId, groupId, roundB]
    );

    // 3. Log swap audit record
    await db.runAsync(
      `INSERT INTO swaps (id, group_id, member_a_id, member_b_id, round_a, round_b, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [swapId, groupId, memberAId, memberBId, roundA, roundB, reason.trim(), now]
    );
  });
}

export interface MemberProfileData {
  member: MemberRecord;
  groupName: string;
  totalContributions: number;
  totalTarget: number;
  onTimeCount: number;
  lateCount: number;
  unpaidCount: number;
  reliabilityScore: number; // 0 to 100
  paymentsHistory: {
    id: string;
    roundNumber: number;
    amount: number;
    targetAmount: number;
    status: 'unpaid' | 'part_paid' | 'paid';
    paidAt: string | null;
    dueDate: string;
    receiptUri: string | null;
    note: string | null;
  }[];
  swaps: {
    id: string;
    roundA: number;
    roundB: number;
    reason: string;
    createdAt: string;
    partnerName: string;
  }[];
}

/**
 * Fetch detailed member payment reliability record and history.
 */
export async function getMemberReliabilityProfile(
  memberId: string
): Promise<MemberProfileData | null> {
  const db = await getDb();

  const member = await db.getFirstAsync<MemberRecord>(
    `SELECT * FROM members WHERE id = ?;`,
    [memberId]
  );
  if (!member) return null;

  const group = await db.getFirstAsync<GroupRecord>(
    `SELECT name FROM groups WHERE id = ?;`,
    [member.group_id]
  );

  const rawPayments = await db.getAllAsync<{
    id: string;
    amount: number;
    target_amount: number;
    status: 'unpaid' | 'part_paid' | 'paid';
    paid_at: string | null;
    round_number: number;
    due_date: string;
    receipt_image_uri: string | null;
    note: string | null;
  }>(
    `SELECT p.id, p.amount, p.target_amount, p.status, p.paid_at, r.round_number, r.due_date, p.receipt_image_uri, p.note
     FROM payments p
     JOIN rounds r ON p.round_id = r.id
     WHERE p.member_id = ?
     ORDER BY r.round_number ASC;`,
    [memberId]
  );

  let onTimeCount = 0;
  let lateCount = 0;
  let unpaidCount = 0;
  let totalContributions = 0;
  let totalTarget = 0;

  for (const pay of rawPayments) {
    totalContributions += pay.amount;
    totalTarget += pay.target_amount;

    if (pay.status === 'paid') {
      if (pay.paid_at && pay.due_date && pay.paid_at > pay.due_date) {
        lateCount++;
      } else {
        onTimeCount++;
      }
    } else {
      unpaidCount++;
    }
  }

  const evaluatedRounds = onTimeCount + lateCount + unpaidCount;
  let reliabilityScore = 100;
  if (evaluatedRounds > 0) {
    // 100 for on-time, 70 for late, 0 for unpaid
    const points = onTimeCount * 100 + lateCount * 70;
    reliabilityScore = Math.max(0, Math.min(100, Math.round(points / evaluatedRounds)));
  }

  // Fetch swaps
  const rawSwaps = await db.getAllAsync<{
    id: string;
    round_a: number;
    round_b: number;
    reason: string;
    created_at: string;
    member_a_id: string;
    member_b_id: string;
  }>(
    `SELECT * FROM swaps WHERE member_a_id = ? OR member_b_id = ? ORDER BY created_at DESC;`,
    [memberId, memberId]
  );

  const swaps: MemberProfileData['swaps'] = [];
  for (const s of rawSwaps) {
    const otherId = s.member_a_id === memberId ? s.member_b_id : s.member_a_id;
    const partner = await db.getFirstAsync<MemberRecord>(
      `SELECT name FROM members WHERE id = ?;`,
      [otherId]
    );
    swaps.push({
      id: s.id,
      roundA: s.round_a,
      roundB: s.round_b,
      reason: s.reason,
      createdAt: s.created_at,
      partnerName: partner?.name || 'Fellow Member',
    });
  }

  return {
    member,
    groupName: group?.name || 'Ajo Group',
    totalContributions,
    totalTarget,
    onTimeCount,
    lateCount,
    unpaidCount,
    reliabilityScore,
    paymentsHistory: rawPayments.map((p) => ({
      id: p.id,
      roundNumber: p.round_number,
      amount: p.amount,
      targetAmount: p.target_amount,
      status: p.status,
      paidAt: p.paid_at,
      dueDate: p.due_date,
      receiptUri: p.receipt_image_uri,
      note: p.note,
    })),
    swaps,
  };
}

export interface CalendarRoundItem {
  roundId: string;
  groupId: string;
  groupName: string;
  frequency: Frequency;
  roundNumber: number;
  totalRounds: number;
  collectorName: string;
  targetAmount: number;
  collectedAmount: number;
  dueDate: string;
  status: 'open' | 'completed';
}

/**
 * Fetch calendar timeline across all active groups ordered by due date.
 */
export async function getCalendarSchedule(): Promise<CalendarRoundItem[]> {
  const db = await getDb();

  const items = await db.getAllAsync<{
    round_id: string;
    group_id: string;
    group_name: string;
    frequency: Frequency;
    round_number: number;
    total_rounds: number;
    collector_name: string;
    target_amount: number;
    collected_amount: number;
    due_date: string;
    status: 'open' | 'completed';
  }>(
    `SELECT r.id as round_id, g.id as group_id, g.name as group_name, g.frequency,
            r.round_number, g.total_rounds, m.name as collector_name,
            r.target_amount, r.collected_amount, r.due_date, r.status
     FROM rounds r
     JOIN groups g ON r.group_id = g.id
     JOIN members m ON r.collector_member_id = m.id
     WHERE g.status = 'active'
     ORDER BY r.due_date ASC;`
  );

  return items.map((item) => ({
    roundId: item.round_id,
    groupId: item.group_id,
    groupName: item.group_name,
    frequency: item.frequency,
    roundNumber: item.round_number,
    totalRounds: item.total_rounds,
    collectorName: item.collector_name,
    targetAmount: item.target_amount,
    collectedAmount: item.collected_amount,
    dueDate: item.due_date,
    status: item.status,
  }));
}
