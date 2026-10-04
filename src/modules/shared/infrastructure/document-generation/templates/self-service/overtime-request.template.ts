import { formMaster } from '../shared';
import {
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const overtimeRequestTemplate = ({ parameters: p }: any) =>
  formMaster({
    title: 'Permohonan Lembur',
    subtitleLines: [formatDateId(p.date)],
    sections: [
      {
        heading: 'Karyawan',
        fields: [
          ['NIK', safeText(p.employeeNumber)],
          ['Nama', safeText(p.employeeName)],
        ],
      },
      {
        heading: 'Detail Lembur',
        fields: [
          ['Jam Mulai', safeText(p.startTime)],
          ['Jam Selesai', safeText(p.endTime)],
          ['Jumlah Jam', safeText(p.hours, '0')],
          ['Referensi Proyek', safeText(p.projectReference)],
          ['Status', safeText(p.status)],
          ['Alasan', safeText(p.reason)],
        ],
      },
    ],
    footerNote: 'Permohonan Lembur',
  });
