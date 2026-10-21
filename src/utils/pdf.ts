import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { GroupRecord, MemberRecord, PaymentRecord, RoundRecord } from '@/db/schema';
import { getAppSetting } from './security';
import {
  BRICOLAGE_600_BASE64,
  INSTRUMENT_400_BASE64,
  INSTRUMENT_600_BASE64,
} from './pdfFonts';

export interface StatementPdfOptions {
  group: GroupRecord;
  round: RoundRecord;
  collector: MemberRecord;
  members: MemberRecord[];
  payments: (PaymentRecord & { member_name: string; member_phone: string; turn_order: number })[];
  isSample?: boolean;
}

export interface ReceiptPdfOptions {
  group: GroupRecord;
  round: RoundRecord;
  collector: MemberRecord;
  member: MemberRecord;
  payment: PaymentRecord;
  isSample?: boolean;
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

/**
 * Generate high-contrast, offline-rendered A4 HTML document with embedded
 * Bricolage Grotesque and Instrument Sans typography.
 */
export function buildStatementHtml(
  opts: StatementPdfOptions,
  organizerName: string = 'Organizer name'
): string {
  const { group, round, collector, payments, isSample } = opts;

  const targetPot = round.target_amount;
  const collectedPot = round.collected_amount;
  const outstandingPot = Math.max(0, targetPot - collectedPot);

  // Calculate separate late fees
  const totalLateFees = payments.reduce((acc, p) => {
    if (p.late_fee_amount && p.late_fee_amount > 0 && !p.late_fee_waived) {
      return acc + p.late_fee_amount;
    }
    return acc;
  }, 0);

  const sampleWatermark = isSample
    ? `<div class="sample-watermark">SAMPLE</div>`
    : '';

  const tableRows = payments
    .map((p) => {
      const isPaid = p.status === 'paid';
      const isPartPaid = p.status === 'part_paid';
      const balance = Math.max(0, p.target_amount - p.amount);

      let statusBadge = '<span class="badge badge-unpaid">Unpaid</span>';
      if (isPaid) {
        statusBadge = '<span class="badge badge-paid">Paid</span>';
      } else if (isPartPaid) {
        statusBadge = '<span class="badge badge-part">Part Paid</span>';
      }

      let lateFeeText = '—';
      if (p.late_fee_amount && p.late_fee_amount > 0) {
        if (p.late_fee_waived) {
          lateFeeText = `<span class="fee-waived">Waived</span>`;
        } else {
          lateFeeText = `<span class="fee-active">${formatNaira(p.late_fee_amount)}</span>`;
        }
      }

      return `
        <tr>
          <td class="col-center">#${p.turn_order}</td>
          <td class="col-name">
            <strong>${p.member_name}</strong>
            <div class="col-sub">${p.member_phone}</div>
          </td>
          <td class="col-center">${statusBadge}</td>
          <td class="col-right">${formatNaira(p.amount)}</td>
          <td class="col-right ${balance > 0 ? 'text-unpaid' : ''}">${formatNaira(balance)}</td>
          <td class="col-center">${lateFeeText}</td>
          <td class="col-center col-date">${formatDate(p.paid_at)}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Ajo Statement - ${group.name}</title>
  <style>
    @font-face {
      font-family: 'Bricolage Grotesque';
      font-style: normal;
      font-weight: 600;
      src: url('data:font/truetype;charset=utf-8;base64,${BRICOLAGE_600_BASE64}') format('truetype');
    }
    @font-face {
      font-family: 'Instrument Sans';
      font-style: normal;
      font-weight: 400;
      src: url('data:font/truetype;charset=utf-8;base64,${INSTRUMENT_400_BASE64}') format('truetype');
    }
    @font-face {
      font-family: 'Instrument Sans';
      font-style: normal;
      font-weight: 600;
      src: url('data:font/truetype;charset=utf-8;base64,${INSTRUMENT_600_BASE64}') format('truetype');
    }

    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #0F172A;
      background-color: #FFFFFF;
      position: relative;
    }

    .sample-watermark {
      position: fixed;
      top: 35%;
      left: 10%;
      right: 10%;
      font-family: 'Bricolage Grotesque', sans-serif;
      font-size: 90pt;
      font-weight: 600;
      color: rgba(203, 213, 225, 0.35);
      text-align: center;
      transform: rotate(-30deg);
      pointer-events: none;
      z-index: 999;
      letter-spacing: 12px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0F172A;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }

    .brand-title {
      font-family: 'Bricolage Grotesque', sans-serif;
      font-size: 20pt;
      font-weight: 600;
      color: #0F172A;
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      font-size: 9pt;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
    }

    .doc-meta {
      text-align: right;
    }

    .doc-type {
      font-family: 'Bricolage Grotesque', sans-serif;
      font-size: 14pt;
      font-weight: 600;
      color: #B45309;
      letter-spacing: 0.5px;
    }

    .doc-date {
      font-size: 9pt;
      color: #475569;
      margin-top: 3px;
    }

    /* Meta Grid */
    .grid-meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 18px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748B;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .meta-value {
      font-size: 10.5pt;
      color: #0F172A;
      font-weight: 600;
    }

    /* Financial Cards */
    .financial-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .f-card {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #FFFFFF;
    }

    .f-card-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748B;
      margin-bottom: 4px;
    }

    .f-card-val {
      font-family: 'Bricolage Grotesque', sans-serif;
      font-size: 14pt;
      font-weight: 600;
      color: #0F172A;
    }

    .f-card.collected .f-card-val {
      color: #065F46;
    }

    .f-card.outstanding .f-card-val {
      color: #991B1B;
    }

    .f-card.late-fee {
      background: #FFFBEB;
      border-color: #FDE68A;
    }
    .f-card.late-fee .f-card-val {
      color: #B45309;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    th {
      font-family: 'Instrument Sans', sans-serif;
      font-weight: 600;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1E293B;
      background: #F1F5F9;
      border-top: 1px solid #CBD5E1;
      border-bottom: 2px solid #94A3B8;
      padding: 8px 10px;
      text-align: left;
    }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 9.5pt;
      color: #1E293B;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background: #F8FAFC;
    }

    .col-center {
      text-align: center;
    }

    .col-right {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .col-name strong {
      color: #0F172A;
    }

    .col-sub {
      font-size: 8pt;
      color: #64748B;
    }

    .col-date {
      font-size: 8.5pt;
      color: #64748B;
      white-space: nowrap;
    }

    .text-unpaid {
      color: #991B1B;
      font-weight: 600;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      font-size: 7.5pt;
      font-weight: 600;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-paid {
      background: #D1FAE5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }

    .badge-part {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .badge-unpaid {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }

    .fee-active {
      color: #B45309;
      font-weight: 600;
      font-size: 8.5pt;
    }

    .fee-waived {
      color: #64748B;
      font-style: italic;
      font-size: 8pt;
    }

    /* Footer */
    .footer {
      border-top: 1px solid #CBD5E1;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      color: #64748B;
      position: relative;
    }

    .footer-notice {
      font-weight: 500;
      color: #475569;
    }
  </style>
</head>
<body>
  ${sampleWatermark}

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-title">YÍPO</div>
      <div class="brand-subtitle">Offline Rotating Savings Record Book</div>
    </div>
    <div class="doc-meta">
      <div class="doc-type">AJO STATEMENT</div>
      <div class="doc-date">Generated: ${formatDate(new Date().toISOString())}</div>
    </div>
  </div>

  <!-- Group Meta Grid -->
  <div class="grid-meta">
    <div class="meta-item">
      <span class="meta-label">Group Name</span>
      <span class="meta-value">${group.name}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Current Cycle</span>
      <span class="meta-value">Round ${round.round_number} of ${group.total_rounds} (${group.frequency})</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Organizer Name</span>
      <span class="meta-value">${organizerName}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Collector This Round</span>
      <span class="meta-value">${collector.name} (Turn #${collector.turn_order})</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Contribution / Member</span>
      <span class="meta-value">${formatNaira(group.contribution_amount)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Round Due Date</span>
      <span class="meta-value">${formatDate(round.due_date)}</span>
    </div>
  </div>

  <!-- Financial Cards -->
  <div class="financial-cards">
    <div class="f-card">
      <div class="f-card-label">Target Pot</div>
      <div class="f-card-val">${formatNaira(targetPot)}</div>
    </div>
    <div class="f-card collected">
      <div class="f-card-label">Collected</div>
      <div class="f-card-val">${formatNaira(collectedPot)}</div>
    </div>
    <div class="f-card outstanding">
      <div class="f-card-label">Outstanding</div>
      <div class="f-card-val">${formatNaira(outstandingPot)}</div>
    </div>
    <div class="f-card late-fee">
      <div class="f-card-label">Late fees (kept separate)</div>
      <div class="f-card-val">${totalLateFees > 0 ? formatNaira(totalLateFees) : 'None'}</div>
    </div>
  </div>

  <!-- Members Payment Table -->
  <table>
    <thead>
      <tr>
        <th style="width: 6%;" class="col-center">Turn</th>
        <th style="width: 30%;">Member</th>
        <th style="width: 14%;" class="col-center">Status</th>
        <th style="width: 14%;" class="col-right">Paid</th>
        <th style="width: 14%;" class="col-right">Balance</th>
        <th style="width: 11%;" class="col-center">Late Fee</th>
        <th style="width: 11%;" class="col-center">Date</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-notice">Records only. Yípo does not hold or move money.</div>
    <div>Page 1 of 1</div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate and share an AJO STATEMENT PDF.
 */
export async function exportStatementPdf(opts: StatementPdfOptions): Promise<void> {
  try {
    const organizerName = await getAppSetting('organizer_name', 'Organizer name');
    const html = buildStatementHtml(opts, organizerName);

    const { uri } = await Print.printToFileAsync({
      html,
      margins: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Ajo Statement - ${opts.group.name}`,
      });
    } else {
      Alert.alert('Statement Generated', `Saved locally to ${uri}`);
    }
  } catch (error: unknown) {
    Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unable to generate PDF statement.');
  }
}
