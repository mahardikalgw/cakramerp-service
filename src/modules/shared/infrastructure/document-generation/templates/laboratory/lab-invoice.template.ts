import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

/**
 * Laboratory invoice (payload-driven). Values such as `subtotal`, `taxAmount`
 * and `totalAmount` are already formatted with Indonesian grouping by the call
 * sites, so they are rendered verbatim.
 */
export const labInvoiceTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Invoice',
    subtitleLines: [cell(p.invoiceNumber)],
    info: [
      ['Tanggal', formatDateId(p.invoiceDate)],
      ['Jatuh Tempo', formatDateId(p.dueDate)],
      ['Customer', safeText(p.customerName)],
      ['Alamat', safeText(p.customerAddress)],
      ['Status', safeText(p.status)],
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
      ['Subtotal', safeText(p.subtotal, '0')],
      [`PPN ${safeText(p.taxPercent, '0')}%`, safeText(p.taxAmount, '0')],
      ['Total', safeText(p.totalAmount, '0')],
    ],
    footerNote: `Disetujui oleh: ${safeText(p.authorizedByName, 'Lab Authorized')}`,
  });
