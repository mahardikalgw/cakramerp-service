import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const purchaseRequestTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Purchase Request',
    subtitleLines: [cell(p.prNumber)],
    info: [
      ['Tanggal', formatDateId(p.requestDate)],
      ['Status', safeText(p.status)],
      ['Prioritas', safeText(p.priority)],
      ['Diminta Oleh', safeText(p.requestedByName)],
      ['Departemen', safeText(p.departmentName)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Item', width: '*' },
      { header: 'Deskripsi', width: '*' },
      { header: 'Qty', width: 45, align: 'right' },
      { header: 'UOM', width: 45, align: 'center' },
      { header: 'Harga Satuan', width: 90, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any) => [
      l.lineNumber,
      cell(l.itemName),
      cell(l.description),
      cell(l.quantity, '0'),
      cell(l.uom),
      formatCurrencyId(l.unitCost),
    ]),
    totals: [
      ['Total', formatCurrencyId(p.totalAmount)],
      ['Grand Total', formatCurrencyId(p.grandTotal ?? p.totalAmount)],
    ],
    note: p.notes ? `Catatan: ${p.notes}` : undefined,
    footerNote: 'Purchase Request',
  });
