import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const salesOrderTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Sales Order',
    subtitleLines: [cell(p.orderNumber)],
    info: [
      ['Tanggal', formatDateId(p.orderDate)],
      ['Status', safeText(p.status)],
      ['Customer', safeText(p.customerName)],
      ['Alamat', safeText(p.customerAddress)],
      ['Mata Uang', safeText(p.currency, 'IDR')],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Item', width: '*' },
      { header: 'Qty', width: 50, align: 'right' },
      { header: 'Harga Satuan', width: 95, align: 'right' },
      { header: 'Total', width: 100, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any) => [
      l.lineNumber,
      cell(l.itemDescription),
      cell(l.quantity, '0'),
      formatCurrencyId(l.unitPrice),
      formatCurrencyId(l.lineTotal),
    ]),
    totals: [['Total', formatCurrencyId(p.totalAmount)]],
    footerNote: 'Sales Order',
  });
