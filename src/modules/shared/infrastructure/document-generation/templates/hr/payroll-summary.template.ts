import { tableMaster, cell } from '../shared';
import {
  formatCurrencyId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const payrollSummaryTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Ringkasan Payroll',
    subtitleLines: [cell(p.payrollPeriod)],
    info: [
      ['Total Karyawan', safeText(p.totalEmployees, '0')],
      ['Total Bruto', formatCurrencyId(p.totalGross)],
      ['Total Potongan', formatCurrencyId(p.totalDeductions)],
      ['Total Bersih', formatCurrencyId(p.totalNet)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'NIK', width: 70 },
      { header: 'Nama', width: '*' },
      { header: 'Departemen', width: '*' },
      { header: 'Bruto', width: 95, align: 'right' },
      { header: 'Potongan', width: 95, align: 'right' },
      { header: 'Bersih', width: 95, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any, i: number) => [
      i + 1,
      cell(l.employeeNumber),
      cell(l.employeeName),
      cell(l.departmentName),
      formatCurrencyId(l.grossPay),
      formatCurrencyId(l.totalDeductions),
      formatCurrencyId(l.netPay),
    ]),
    totals: [['Total Bersih', formatCurrencyId(p.totalNet)]],
    footerNote: 'Payroll Summary',
  });
