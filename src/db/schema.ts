export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface GroupRecord {
  id: string;
  name: string;
  contribution_amount: number; // integer (naira)
  frequency: Frequency;
  start_date: string; // ISO 8601
  total_rounds: number;
  current_round: number;
  status: 'active' | 'completed' | 'archived';
  late_fee_type?: 'none' | 'fixed' | 'percentage';
  late_fee_value?: number;
  late_fee_grace_days?: number;
  created_at: string;
  updated_at: string;
}

export interface MemberRecord {
  id: string;
  group_id: string;
  name: string;
  phone: string; // normalized 234XXXXXXXXXX
  formatted_phone: string;
  note: string | null;
  turn_order: number; // 1, 2, 3...
  payout_round: number; // which round they collect
  created_at: string;
}

export interface RoundRecord {
  id: string;
  group_id: string;
  round_number: number;
  collector_member_id: string;
  target_amount: number; // integer (naira)
  collected_amount: number; // integer (naira)
  due_date: string; // ISO 8601
  status: 'open' | 'completed';
  completed_at: string | null;
  collector_confirmed: number; // 0 or 1
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  group_id: string;
  round_id: string;
  member_id: string;
  amount: number; // amount paid so far in naira
  target_amount: number; // amount due in naira
  status: 'unpaid' | 'part_paid' | 'paid';
  paid_at: string | null;
  receipt_image_uri: string | null;
  note: string | null;
  late_fee_amount?: number;
  late_fee_waived?: number;
  late_fee_waived_reason?: string | null;
  reminded_at?: string | null;
  created_at: string;
}

export interface SwapRecord {
  id: string;
  group_id: string;
  member_a_id: string;
  member_b_id: string;
  round_a: number;
  round_b: number;
  reason: string;
  created_at: string;
}

export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        contribution_amount INTEGER NOT NULL,
        frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        total_rounds INTEGER NOT NULL,
        current_round INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        formatted_phone TEXT NOT NULL,
        note TEXT,
        turn_order INTEGER NOT NULL,
        payout_round INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        collector_member_id TEXT NOT NULL,
        target_amount INTEGER NOT NULL,
        collected_amount INTEGER NOT NULL DEFAULT 0,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        completed_at TEXT,
        collector_confirmed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
        FOREIGN KEY (collector_member_id) REFERENCES members (id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        target_amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'unpaid',
        paid_at TEXT,
        receipt_image_uri TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
        FOREIGN KEY (round_id) REFERENCES rounds (id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS swaps (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL,
        member_a_id TEXT NOT NULL,
        member_b_id TEXT NOT NULL,
        round_a INTEGER NOT NULL,
        round_b INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_members_group_order ON members(group_id, turn_order);
      CREATE INDEX IF NOT EXISTS idx_rounds_group_round ON rounds(group_id, round_number);
      CREATE INDEX IF NOT EXISTS idx_payments_round_member ON payments(round_id, member_id);
    `,
  },
  {
    version: 2,
    name: 'app_settings',
    up: `
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
  {
    version: 3,
    name: 'plus_features_late_fees_reminders',
    up: `
      ALTER TABLE groups ADD COLUMN late_fee_type TEXT DEFAULT 'none';
      ALTER TABLE groups ADD COLUMN late_fee_value INTEGER DEFAULT 0;
      ALTER TABLE groups ADD COLUMN late_fee_grace_days INTEGER DEFAULT 0;

      ALTER TABLE payments ADD COLUMN late_fee_amount INTEGER DEFAULT 0;
      ALTER TABLE payments ADD COLUMN late_fee_waived INTEGER DEFAULT 0;
      ALTER TABLE payments ADD COLUMN late_fee_waived_reason TEXT;
      ALTER TABLE payments ADD COLUMN reminded_at TEXT;
    `,
  },
];
