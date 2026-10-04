import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

export const labContractTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Kontrak Kerjasama Laboratorium',
    subtitleLines: [cell(p.contractNumber)],
    info: [
      ['Customer', safeText(p.customerName)],
      ['Proyek', safeText(p.projectName)],
      ['Lokasi', safeText(p.projectLocation)],
      ['Jenis Pembayaran', safeText(p.billingType)],
      ['Masa Kontrak', safeText(p.contractTerm)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Layanan', width: '*' },
      { header: 'Kode Sampel', width: '*' },
      { header: 'Jumlah', width: 70, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any, i: number) => [
      i + 1,
      cell(l.serviceName),
      cell(l.sampleCode),
      cell(l.quantity, '0'),
    ]),
    totals: [
      ['Kuota Total', safeText(p.totalQuota, '0')],
      ['Kuota Terpakai', safeText(p.usedQuota, '0')],
      ['Sisa Kuota', safeText(p.remainingQuota, '0')],
      ['Nilai Dasar', safeText(p.baseAmount, '0')],
      [`PPN ${safeText(p.taxPercent, '0')}`, safeText(p.taxAmount, '0')],
      ['Nilai Kontrak', safeText(p.totalAmount, '0')],
    ],
    note: `Berlaku sampai ${formatDateId(p.expiresAt)} - dibuat oleh ${safeText(
      p.generatedByName,
      'Admin',
    )}`,
    footerNote: 'Kontrak Laboratorium',
  });
