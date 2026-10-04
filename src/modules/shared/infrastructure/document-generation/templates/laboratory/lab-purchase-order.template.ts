import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

export const labPurchaseOrderTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Surat Perintah Kerja / Purchase Order',
    subtitleLines: [cell(p.poNumber)],
    info: [
      ['No. Permohonan', safeText(p.requestNumber)],
      ['Tanggal', formatDateId(p.orderDate)],
      ['Customer', safeText(p.customerName)],
      ['Alamat', safeText(p.customerAddress)],
      ['Status', safeText(p.status)],
      ['Total Sampel', safeText(p.totalSamples, '0')],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Layanan Uji', width: '*' },
      { header: 'Kode Sampel', width: '*' },
      { header: 'Jumlah', width: 70, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any, i: number) => [
      i + 1,
      cell(l.serviceName),
      cell(l.sampleCode),
      cell(l.quantity, '0'),
    ]),
    footerNote: `Disetujui oleh: ${safeText(p.authorizedByName, 'Lab Authorized')}`,
  });
