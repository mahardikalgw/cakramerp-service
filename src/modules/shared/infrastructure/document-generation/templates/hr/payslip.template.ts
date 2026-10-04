import { formMaster } from '../shared';
import {
  formatCurrencyId,
  safeText,
} from '../../infrastructure/formatting/id-format';

export const payslipTemplate = ({ parameters: p }: any) =>
  formMaster({
    title: 'Slip Gaji',
    subtitleLines: [safeText(p.payrollPeriod)],
    sections: [
      {
        heading: 'Karyawan',
        fields: [
          ['NIK', safeText(p.employeeNumber)],
          ['Nama', safeText(p.employeeName)],
          ['Departemen', safeText(p.departmentName)],
        ],
      },
      {
        heading: 'Penghasilan',
        fields: [
          ['Gaji Pokok', formatCurrencyId(p.basicSalary)],
          ['Tunjangan', formatCurrencyId(p.allowances)],
          ['Lembur', formatCurrencyId(p.overtimePay)],
          ['Bruto', formatCurrencyId(p.grossPay)],
        ],
      },
      {
        heading: 'Potongan',
        fields: [
          ['PPh 21', formatCurrencyId(p.pph21Deduction)],
          ['BPJS Karyawan', formatCurrencyId(p.bpjsEmployeeDeduction)],
          ['Potongan Lain', formatCurrencyId(p.otherDeductions)],
          ['Total Potongan', formatCurrencyId(p.totalDeductions)],
        ],
      },
    ],
    note: `Gaji Bersih: ${formatCurrencyId(p.netPay)}`,
    footerNote: 'Slip Gaji',
  });
