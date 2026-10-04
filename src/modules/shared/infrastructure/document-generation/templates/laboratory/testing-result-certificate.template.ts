import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

export const testingResultCertificateTemplate = ({
  parameters: p,
  lines,
}: any) =>
  tableMaster({
    title: 'Sertifikat Hasil Uji',
    subtitleLines: [cell(p.certificateNumber)],
    info: [
      ['Kode Sampel', safeText(p.sampleCode)],
      ['Customer', safeText(p.customerName)],
      ['Proyek', safeText(p.projectName)],
      ['Layanan Uji', safeText(p.testingServiceName)],
      ['Tanggal Terima', formatDateId(p.submittedAt)],
      ['Umur Sampel (hari)', safeText(p.sampleAge)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Parameter', width: '*' },
      { header: 'Hasil', width: '*' },
      { header: 'Satuan', width: 80, align: 'center' },
    ],
    rows: (lines ?? []).map((l: any, i: number) => [
      i + 1,
      cell(l.parameter ?? l.name),
      cell(l.value ?? l.result),
      cell(l.unit),
    ]),
    note: p.qrHash ? `Verifikasi: ${p.qrHash}` : undefined,
    footerNote: 'Sertifikat Hasil Uji',
  });
