import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

export const labTaxInvoiceTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Faktur Pajak',
    subtitleLines: [cell(p.invoiceNumber)],
    info: [
      ['Tanggal', formatDateId(p.invoiceDate)],
      ['Customer', safeText(p.customerName)],
      ['Alamat', safeText(p.customerAddress)],
      ['NPWP', safeText(p.customerNpwp)],
    ],
    columns: [
      { header: 'Deskripsi', width: '*' },
      { header: 'Qty', width: 60, align: 'right' },
      { header: 'Harga Satuan', width: 110, align: 'right' },
      { header: 'Total', width: 120, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any) => [
      cell(l.description),
      cell(l.quantity, '0'),
      safeText(l.unitPrice, '0'),
      safeText(l.total, '0'),
    ]),
    totals: [
      ['DPP', safeText(p.subtotal, '0')],
      [`PPN ${safeText(p.taxPercent, '0')}%`, safeText(p.taxAmount, '0')],
      ['Total', safeText(p.totalAmount, '0')],
    ],
    footerNote: 'Faktur Pajak',
  });
