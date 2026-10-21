import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDb } from '@/db/client';

/**
 * Escape a string for CSV format (wraps in quotes and escapes internal double-quotes).
 */
function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export all contribution and group records into an Excel-friendly CSV spreadsheet.
 */
export async function exportAllRecordsToCSV(): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  try {
    const db = await getDb();

    const records = await db.getAllAsync<{
      group_name: string;
      frequency: string;
      round_number: number;
      member_name: string;
      formatted_phone: string;
      target_amount: number;
      amount: number;
      status: string;
      paid_at: string | null;
      due_date: string;
      note: string | null;
    }>(
      `SELECT g.name as group_name, g.frequency, r.round_number,
              m.name as member_name, m.formatted_phone,
              p.target_amount, p.amount, p.status, p.paid_at, r.due_date, p.note
       FROM payments p
       JOIN members m ON p.member_id = m.id
       JOIN rounds r ON p.round_id = r.id
       JOIN groups g ON p.group_id = g.id
       ORDER BY g.name ASC, r.round_number ASC, m.turn_order ASC;`
    );

    const headers = [
      'Group Name',
      'Frequency',
      'Round Number',
      'Member Name',
      'Phone Number',
      'Target Due (NGN)',
      'Amount Paid (NGN)',
      'Status',
      'Date Paid',
      'Due Date',
      'Organizer Note',
    ];

    const rows: string[] = [];
    rows.push(headers.map(escapeCSV).join(','));

    for (const rec of records) {
      rows.push(
        [
          escapeCSV(rec.group_name),
          escapeCSV(rec.frequency),
          escapeCSV(rec.round_number),
          escapeCSV(rec.member_name),
          escapeCSV(rec.formatted_phone),
          escapeCSV(rec.target_amount),
          escapeCSV(rec.amount),
          escapeCSV(rec.status),
          escapeCSV(rec.paid_at ? new Date(rec.paid_at).toLocaleDateString() : 'N/A'),
          escapeCSV(new Date(rec.due_date).toLocaleDateString()),
          escapeCSV(rec.note || ''),
        ].join(',')
      );
    }

    const csvContent = rows.join('\n');
    const fileName = `yipo_records_${Date.now()}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Ajo Records (CSV)',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return { success: true, filePath };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'CSV export failed',
    };
  }
}
