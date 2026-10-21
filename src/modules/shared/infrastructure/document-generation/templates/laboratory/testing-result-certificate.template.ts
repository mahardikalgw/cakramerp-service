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
      [
        'Kode Sampel',
        safeText(
          p.sampleUnit && p.resultNumber
            ? `unit-${p.sampleUnit}-${p.resultNumber}`
            : p.sampleCode,
        ),
      ],
      ['No. Hasil', safeText(p.resultNumber)],
      ['Customer', safeText(p.customerName)],
      ['Proyek', safeText(p.projectName)],
      ['Layanan Uji', safeText(p.testingServiceName)],
      ['Tanggal Terima', formatDateId(p.submittedAt)],
      ['Diterima Oleh', safeText(p.submittedByName)],
      ['Tanggal Uji', formatDateId(p.testingDate)],
      ['Tanggal Dibuat', formatDateId(p.createdDate)],
      ['Tanggal Sertifikat', formatDateId(p.certificateDate)],
      ['Umur Sampel (hari)', safeText(p.sampleAge)],
      ['Berat', safeText(p.berat)],
      ['Luas', safeText(p.luas)],
      ['Retakan', safeText(p.retakan)],
      ['Mutu', safeText(p.mutu)],
      ['Produk', safeText(p.produk)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Parameter', width: '*' },
      { header: 'Hasil', width: '*' },
      { header: 'Satuan', width: 70, align: 'center' },
      { header: 'Metode', width: 110 },
      { header: 'SOP', width: 90 },
    ],
    rows: (lines ?? []).map((l: any, i: number) => [
      i + 1,
      cell(l.parameter ?? l.name),
      cell(l.value ?? l.result),
      cell(l.unit),
      cell(l.method),
      cell(l.sop),
    ]),
    note:
      [
        p.resultNotes ? `Catatan: ${safeText(p.resultNotes)}` : '',
        `Disetujui oleh: ${safeText(
          p.labSignatureName ?? p.laboranName,
        )} / ${safeText(p.customerSignatureName ?? p.customerName)}`,
        p.qrHash ? `Verifikasi: ${p.qrHash}` : '',
      ]
        .filter((s) => s)
        .join('  \u2022  ') || undefined,
    footerNote: 'Sertifikat Hasil Uji',
  });
