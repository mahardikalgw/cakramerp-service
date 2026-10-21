import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

export const contractMonthlyInvoiceTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Invoice Bulanan Kontrak',
    subtitleLines: [cell(p.invoiceNumber)],
    info: [
      [
        'Periode',
        safeText(
          p.period ??
            [p.billingPeriodStart, p.billingPeriodEnd]
              .filter(Boolean)
              .join(' s/d '),
          '-',
        ),
      ],
      ['Total Sampel', safeText(p.totalSamples)],
      ['Tanggal', formatDateId(p.invoiceDate)],
      ['Customer', safeText(p.customerName)],
      ['Kontrak', safeText(p.contractNumber)],
    ],
    columns: [
      { header: 'Kode Sampel', width: 90 },
      { header: 'Layanan', width: '*' },
      { header: 'Qty', width: 55, align: 'right' },
      { header: 'Harga Satuan', width: 100, align: 'right' },
      { header: 'Total', width: 105, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any) => [
      cell(l.sampleCode ?? l.description),
      cell(l.serviceName ?? l.description),
      cell(l.quantity, '0'),
      safeText(l.unitPrice, '0'),
      safeText(l.total ?? l.totalPrice, '0'),
    ]),
    totals: [
      ['DPP', safeText(p.baseAmount ?? p.subtotal, '0')],
      [`PPN ${safeText(p.taxPercent, '0')}%`, safeText(p.taxAmount, '0')],
      ['Total', safeText(p.totalAmount, '0')],
    ],
    note: p.completedAt ? `Selesai: ${formatDateId(p.completedAt)}` : undefined,
    footerNote: 'Invoice Bulanan Kontrak',
  });
