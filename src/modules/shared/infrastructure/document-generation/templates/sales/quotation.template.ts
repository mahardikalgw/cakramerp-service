import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const quotationTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Quotation',
    subtitleLines: [cell(p.quotationNumber)],
    info: [
      ['Tanggal', formatDateId(p.quotationDate)],
      ['Berlaku Hingga', formatDateId(p.validUntil)],
      ['Status', safeText(p.status)],
      ['Customer', safeText(p.customerName)],
      ['Alamat', safeText(p.customerAddress)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Item', width: '*' },
      { header: 'Deskripsi', width: '*' },
      { header: 'Qty', width: 45, align: 'right' },
      { header: 'UOM', width: 40, align: 'center' },
      { header: 'Harga', width: 85, align: 'right' },
      { header: 'Jumlah', width: 95, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any) => [
      l.lineNumber,
      cell(l.itemName),
      cell(l.description),
      cell(l.quantity, '0'),
      cell(l.uom),
      formatCurrencyId(l.unitPrice),
      formatCurrencyId(l.amount),
    ]),
    totals: [
      ['Subtotal', formatCurrencyId(p.totalAmount)],
      ['Pajak', formatCurrencyId(p.taxAmount)],
      ['Grand Total', formatCurrencyId(p.grandTotal)],
    ],
    footerNote: 'Quotation',
  });
