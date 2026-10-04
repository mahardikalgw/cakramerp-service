import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const journalEntryTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Journal Entry',
    subtitleLines: [cell(p.entryNumber)],
    info: [
      ['Tanggal', formatDateId(p.entryDate)],
      ['Status', safeText(p.status)],
      ['Deskripsi', safeText(p.description)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Kode Akun', width: 70, align: 'center' },
      { header: 'Nama Akun', width: '*' },
      { header: 'Debit', width: 100, align: 'right' },
      { header: 'Kredit', width: 100, align: 'right' },
      { header: 'Keterangan', width: '*' },
    ],
    rows: (lines ?? []).map((l: any) => [
      l.lineNumber,
      cell(l.accountCode),
      cell(l.accountName),
      formatCurrencyId(l.debit),
      formatCurrencyId(l.credit),
      cell(l.lineDescription),
    ]),
    totals: [
      ['Total Debit', formatCurrencyId(p.totalDebit)],
      ['Total Kredit', formatCurrencyId(p.totalCredit)],
    ],
    footerNote: 'Journal Entry',
  });
