import { tableMaster, cell } from '../shared';
import {
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const goodsReceiptTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Goods Receipt',
    subtitleLines: [cell(p.receiptNumber)],
    info: [
      ['Tanggal', formatDateId(p.receiptDate)],
      ['Status', safeText(p.status)],
      ['PO', safeText(p.poNumber)],
      ['Supplier', safeText(p.supplierName)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Item', width: '*' },
      { header: 'Qty Diterima', width: 80, align: 'right' },
      { header: 'UOM', width: 45, align: 'center' },
      { header: 'Kondisi', width: '*' },
    ],
    rows: (lines ?? []).map((l: any) => [
      l.lineNumber,
      cell(l.itemName),
      cell(l.quantityReceived, '0'),
      cell(l.uom),
      cell(l.conditionNotes),
    ]),
    note: p.notes ? `Catatan: ${p.notes}` : undefined,
    footerNote: 'Goods Receipt',
  });
