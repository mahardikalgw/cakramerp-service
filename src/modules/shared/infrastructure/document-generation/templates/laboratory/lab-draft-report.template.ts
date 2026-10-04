import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

export const labDraftReportTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Laporan Harian (Draft)',
    subtitleLines: [cell(p.requestNumber)],
    info: [
      ['Proyek', safeText(p.projectName)],
      ['Lokasi', safeText(p.projectLocation)],
      ['Customer', safeText(p.customerName)],
      ['Telepon', safeText(p.customerPhone)],
      ['Email', safeText(p.customerEmail)],
      ['Tanggal Jadwal', formatDateId(p.scheduleDate)],
      ['Laboran', safeText(p.assignedLaboranName)],
      ['Status', safeText(p.status)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Layanan Uji', width: '*' },
      { header: 'Kode Layanan', width: 90, align: 'center' },
      { header: 'Jumlah Sampel', width: 90, align: 'right' },
      { header: 'Catatan', width: '*' },
    ],
    rows: (lines ?? []).map((l: any, i: number) => [
      i + 1,
      cell(l.serviceName),
      cell(l.serviceCode),
      cell(l.sampleQuantity, '0'),
      cell(l.lineNotes),
    ]),
    note: p.notes ? `Catatan: ${p.notes}` : undefined,
    footerNote: 'Laporan Harian - DRAFT',
  });
