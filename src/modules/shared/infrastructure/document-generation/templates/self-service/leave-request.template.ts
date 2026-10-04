import { formMaster } from '../shared';
import {
  formatDateId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const leaveRequestTemplate = ({ parameters: p }: any) =>
  formMaster({
    title: 'Permohonan Cuti',
    subtitleLines: [safeText(p.leaveTypeName)],
    sections: [
      {
        heading: 'Karyawan',
        fields: [
          ['NIK', safeText(p.employeeNumber)],
          ['Nama', safeText(p.employeeName)],
        ],
      },
      {
        heading: 'Detail Cuti',
        fields: [
          ['Tanggal Mulai', formatDateId(p.startDate)],
          ['Tanggal Selesai', formatDateId(p.endDate)],
          ['Jumlah Hari Kerja', safeText(p.workingDays, '0')],
          ['Status', safeText(p.status)],
          ['Alasan', safeText(p.reason)],
        ],
      },
    ],
    footerNote: 'Permohonan Cuti',
  });
