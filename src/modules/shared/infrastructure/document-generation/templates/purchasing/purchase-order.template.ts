import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const purchaseOrderTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Purchase Order',
    subtitleLines: [cell(p.orderNumber)],
    info: [
      ['Tanggal', formatDateId(p.orderDate)],
      ['Status', safeText(p.status)],
      ['Supplier', safeText(p.supplierName)],
      ['Alamat', safeText(p.supplierAddress)],
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
    footerNote: 'Purchase Order',
  });
