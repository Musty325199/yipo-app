import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '@/db/client';
import { GroupRecord, MemberRecord, RoundRecord, PaymentRecord, SwapRecord } from '@/db/schema';

export interface YipoBackupPayload {
  app: 'Yípo';
  schemaVersion: number;
  exportedAt: string;
  data: {
    groups: GroupRecord[];
    members: MemberRecord[];
    rounds: RoundRecord[];
    payments: PaymentRecord[];
    swaps: SwapRecord[];
  };
}

/**
 * Export complete local SQLite database as a JSON backup file and share it.
 */
export async function exportJsonBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const db = await getDb();

    const groups = await db.getAllAsync<GroupRecord>(`SELECT * FROM groups;`);
    const members = await db.getAllAsync<MemberRecord>(`SELECT * FROM members;`);
    const rounds = await db.getAllAsync<RoundRecord>(`SELECT * FROM rounds;`);
    const payments = await db.getAllAsync<PaymentRecord>(`SELECT * FROM payments;`);
    const swaps = await db.getAllAsync<SwapRecord>(`SELECT * FROM swaps;`);

    const payload: YipoBackupPayload = {
      app: 'Yípo',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        groups,
        members,
        rounds,
        payments,
        swaps,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const fileName = `yipo_backup_${Date.now()}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Save Yípo Database Backup',
        UTI: 'public.json',
      });
    }

    return { success: true, filePath };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to export backup',
    };
  }
}

/**
 * Pick and restore database from a previously exported Yípo JSON file.
 */
export async function restoreJsonBackup(): Promise<{
  success: boolean;
  restoredGroupsCount?: number;
  error?: string;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) {
      return { success: false, error: 'File selection canceled' };
    }

    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed: YipoBackupPayload = JSON.parse(content);

    if (parsed.app !== 'Yípo' || !parsed.data) {
      throw new Error('Invalid Yípo backup file format.');
    }

    const db = await getDb();

    await db.withTransactionAsync(async () => {
      // Clear existing records
      await db.runAsync(`DELETE FROM swaps;`);
      await db.runAsync(`DELETE FROM payments;`);
      await db.runAsync(`DELETE FROM rounds;`);
      await db.runAsync(`DELETE FROM members;`);
      await db.runAsync(`DELETE FROM groups;`);

      // Restore groups
      for (const g of parsed.data.groups) {
        await db.runAsync(
          `INSERT INTO groups (id, name, contribution_amount, frequency, start_date, total_rounds, current_round, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            g.id,
            g.name,
            g.contribution_amount,
            g.frequency,
            g.start_date,
            g.total_rounds,
            g.current_round,
            g.status,
            g.created_at,
            g.updated_at,
          ]
        );
      }

      // Restore members
      for (const m of parsed.data.members) {
        await db.runAsync(
          `INSERT INTO members (id, group_id, name, phone, formatted_phone, note, turn_order, payout_round, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            m.id,
            m.group_id,
            m.name,
            m.phone,
            m.formatted_phone,
            m.note,
            m.turn_order,
            m.payout_round,
            m.created_at,
          ]
        );
      }

      // Restore rounds
      for (const r of parsed.data.rounds) {
        await db.runAsync(
          `INSERT INTO rounds (id, group_id, round_number, collector_member_id, target_amount, collected_amount, due_date, status, completed_at, collector_confirmed, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            r.id,
            r.group_id,
            r.round_number,
            r.collector_member_id,
            r.target_amount,
            r.collected_amount,
            r.due_date,
            r.status,
            r.completed_at,
            r.collector_confirmed,
            r.created_at,
          ]
        );
      }

      // Restore payments
      for (const p of parsed.data.payments) {
        await db.runAsync(
          `INSERT INTO payments (id, group_id, round_id, member_id, amount, target_amount, status, paid_at, receipt_image_uri, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            p.id,
            p.group_id,
            p.round_id,
            p.member_id,
            p.amount,
            p.target_amount,
            p.status,
            p.paid_at,
            p.receipt_image_uri,
            p.note,
            p.created_at,
          ]
        );
      }

      // Restore swaps
      for (const s of parsed.data.swaps) {
        await db.runAsync(
          `INSERT INTO swaps (id, group_id, member_a_id, member_b_id, round_a, round_b, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            s.id,
            s.group_id,
            s.member_a_id,
            s.member_b_id,
            s.round_a,
            s.round_b,
            s.reason,
            s.created_at,
          ]
        );
      }
    });

    return { success: true, restoredGroupsCount: parsed.data.groups.length };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Restore failed',
    };
  }
}
