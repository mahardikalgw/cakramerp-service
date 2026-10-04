import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const purchaseReturnTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Purchase Return',
    subtitleLines: [cell(p.returnNumber)],
    info: [
      ['Tanggal', formatDateId(p.returnDate)],
      ['Status', safeText(p.status)],
      ['Supplier', safeText(p.supplierName)],
      ['Alasan', safeText(p.reason)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Item', width: '*' },
      { header: 'Qty', width: 50, align: 'right' },
      { header: 'UOM', width: 45, align: 'center' },
      { header: 'Harga Satuan', width: 95, align: 'right' },
      { header: 'Total', width: 100, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any) => [
      l.lineNumber,
      cell(l.itemName),
      cell(l.quantity, '0'),
      cell(l.uom),
      formatCurrencyId(l.unitCost),
      formatCurrencyId(l.lineTotal),
    ]),
    totals: [['Total', formatCurrencyId(p.totalAmount)]],
    footerNote: 'Purchase Return',
  });
