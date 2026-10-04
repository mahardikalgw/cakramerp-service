import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const salesInvoiceTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Invoice',
    subtitleLines: [cell(p.invoiceNumber)],
    info: [
      ['Tanggal Terbit', formatDateId(p.invoiceDate)],
      ['Jatuh Tempo', formatDateId(p.dueDate)],
      ['Status', safeText(p.status)],
      ['Customer', safeText(p.customerName)],
      ['Alamat', safeText(p.customerAddress)],
    ],
    columns: [
      { header: 'Deskripsi', width: '*' },
      { header: 'Qty', width: 50, align: 'right' },
      { header: 'Harga Satuan', width: 95, align: 'right' },
      { header: 'Total', width: 100, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any) => [
      cell(l.lineDescription),
      cell(l.quantity, '0'),
      formatCurrencyId(l.unitPrice),
      formatCurrencyId(l.lineTotal),
    ]),
    totals: [
      ['Total', formatCurrencyId(p.totalAmount)],
      ['Dibayar', formatCurrencyId(p.paidAmount)],
    ],
    footerNote: 'Invoice',
  });
