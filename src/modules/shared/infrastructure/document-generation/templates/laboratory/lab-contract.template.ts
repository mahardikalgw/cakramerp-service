import { tableMaster, cell } from '../shared';
import {
  safeText,
  formatDateId,
} from '../../infrastructure/formatting/id-format';

export const labContractTemplate = ({ parameters: p, lines }: any) =>
  tableMaster({
    title: 'Kontrak Kerjasama Laboratorium',
    subtitleLines: [cell(p.contractNumber)],
    info: [
      ['Customer', safeText(p.customerName)],
      ['Alamat', safeText(p.customerAddress)],
      ['Proyek', safeText(p.projectName)],
      ['Lokasi', safeText(p.projectLocation)],
      ['Jenis Pembayaran', safeText(p.billingType)],
      ['Masa Kontrak', safeText(p.contractTerm)],
    ],
    columns: [
      { header: 'No', width: 30, align: 'center' },
      { header: 'Layanan', width: '*' },
      { header: 'Kode Sampel', width: '*' },
      { header: 'Jumlah', width: 55, align: 'right' },
      { header: 'Harga Satuan', width: 95, align: 'right' },
      { header: 'Total', width: 100, align: 'right' },
    ],
    rows: (lines ?? []).map((l: any, i: number) => [
      i + 1,
      cell(l.serviceName),
      cell(l.sampleCode),
      cell(l.sampleQuantity ?? l.quantity, '0'),
      safeText(l.unitPrice, '0'),
      safeText(l.totalPrice ?? l.total, '0'),
    ]),
    totals: [
      ['Kuota Total', safeText(p.totalQuota, '0')],
      ['Kuota Terpakai', safeText(p.usedQuota, '0')],
      ['Sisa Kuota', safeText(p.remainingQuota, '0')],
      ['Nilai Dasar', safeText(p.baseAmount, '0')],
      [`PPN ${safeText(p.taxPercent, '0')}`, safeText(p.taxAmount, '0')],
      ['Nilai Kontrak', safeText(p.totalAmount, '0')],
    ],
    sections: [
      ...(p.scopeOfTesting
        ? [
            {
              heading: 'Lingkup Pengujian',
              lines: [safeText(p.scopeOfTesting)],
            },
          ]
        : []),
      ...(String(p.isCash) === 'true'
        ? [
            {
              heading: 'Ketentuan Pembayaran',
              lines: ['Pembayaran penuh di muka (cash).'],
            },
          ]
        : [
            {
              heading: 'Ketentuan Pembayaran',
              lines: [
                safeText(
                  p.paymentTerms,
                  'Penagihan bulanan per sampel setiap tanggal 25.',
                ),
                ...(p.downPaymentAmount
                  ? [
                      `Uang muka: Rp ${safeText(p.downPaymentAmount, '0')}`,
                      `* Uang muka harus dibayar dalam 7 hari (jatuh tempo: ${safeText(
                        p.dpDueDate,
                        '-',
                      )}). Kontrak aktif setelah konfirmasi pembayaran.`,
                    ]
                  : []),
              ],
            },
          ]),
    ],
    signatures: [
      ['Pihak Laboratorium', safeText(p.labSignatureName, 'Lab Authorized')],
      ['Pihak Customer', safeText(p.customerSignatureName, 'Customer')],
    ],
    note: `Berlaku sampai ${formatDateId(p.expiresAt)} - dibuat oleh ${safeText(
      p.generatedByName,
      'Admin',
    )}`,
    footerNote: 'Kontrak Laboratorium',
  });
