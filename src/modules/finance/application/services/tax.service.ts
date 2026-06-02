import { TaxServicePort } from '../ports/tax-service.port';
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { TAX_INVOICE_REPOSITORY } from '../../domain/repositories/finance-repository.port';
import type { TaxInvoiceRepositoryPort } from '../../domain/repositories/finance-repository.port';
import { TaxInvoiceTypeOrmEntity } from '../../infrastructure/entities/tax-invoice-typeorm.entity';

export interface TaxInvoiceResponse {
  id: string;
  taxInvoiceNumber: string;
  arInvoiceId: string;
  transactionDate: string;
  clientNpwp: string;
  clientName: string;
  dpp: number;
  ppnAmount: number;
  status: string;
  validationErrors: string[];
}

export interface TaxReportSummary {
  month: number;
  year: number;
  invoices: TaxInvoiceResponse[];
  totalDpp: number;
  totalPpn: number;
  validationErrors: { invoiceId: string; errors: string[] }[];
  hasErrors: boolean;
}

@Injectable()
export class TaxService implements TaxServicePort {
  constructor(
    @Inject(TAX_INVOICE_REPOSITORY)
    private readonly repo: TaxInvoiceRepositoryPort,
  ) {}

  async getMonthlyReport(
    month: number,
    year: number,
  ): Promise<TaxReportSummary> {
    const invoices = await this.repo.findByMonthAndYear(month, year);

    const validationErrors: { invoiceId: string; errors: string[] }[] = [];
    let totalDpp = 0;
    let totalPpn = 0;

    const invoiceResponses: TaxInvoiceResponse[] = invoices.map(
      (inv: TaxInvoiceTypeOrmEntity) => {
        const errors = this.validateTaxInvoice(inv);
        if (errors.length > 0) {
          validationErrors.push({ invoiceId: inv.id, errors });
        }
        totalDpp += Number(inv.dpp);
        totalPpn += Number(inv.ppnAmount);

        return {
          id: inv.id,
          taxInvoiceNumber: inv.taxInvoiceNumber,
          arInvoiceId: inv.arInvoiceId,
          transactionDate:
            inv.transactionDate?.toISOString?.() ?? String(inv.transactionDate),
          clientNpwp: inv.clientNpwp,
          clientName: inv.clientName,
          dpp: Number(inv.dpp),
          ppnAmount: Number(inv.ppnAmount),
          status: inv.status,
          validationErrors: errors,
        };
      },
    );

    return {
      month,
      year,
      invoices: invoiceResponses,
      totalDpp,
      totalPpn,
      validationErrors,
      hasErrors: validationErrors.length > 0,
    };
  }

  async exportCsv(month: number, year: number): Promise<string> {
    const report = await this.getMonthlyReport(month, year);

    if (report.hasErrors) {
      throw new BadRequestException(
        'Cannot export: there are validation errors. Fix them first.',
      );
    }

    // e-Faktur DJP CSV format
    // Header: FK, KD_JENIS_TRANSAKSI, FG_PENGGANTI, NOMOR_FAKTUR, MASA_PAJAK, TAHUN_PAJAK, TANGGAL_FAKTUR, NPWP, NAMA, ALAMAT_LENGKAP, JUMLAH_DPP, JUMLAH_PPN, JUMLAH_PPNBM, ID_KETERANGAN_TAMBAHAN, FG_UANG_MUKA, UANG_MUKA_DPP, UANG_MUKA_PPN, UANG_MUKA_PPNBM, REFERENSI
    const rows: string[] = [];

    // FK header row
    rows.push(
      'FK,KD_JENIS_TRANSAKSI,FG_PENGGANTI,NOMOR_FAKTUR,MASA_PAJAK,TAHUN_PAJAK,TANGGAL_FAKTUR,NPWP,NAMA,ALAMAT_LENGKAP,JUMLAH_DPP,JUMLAH_PPN,JUMLAH_PPNBM,ID_KETERANGAN_TAMBAHAN,FG_UANG_MUKA,UANG_MUKA_DPP,UANG_MUKA_PPN,UANG_MUKA_PPNBM,REFERENSI',
    );

    for (const inv of report.invoices) {
      const tanggal = inv.transactionDate.split('T')[0].replace(/-/g, '/');
      rows.push(
        `FK,01,0,${inv.taxInvoiceNumber},${String(month).padStart(2, '0')},${year},${tanggal},${inv.clientNpwp},"${inv.clientName}",,${Math.round(inv.dpp)},${Math.round(inv.ppnAmount)},0,,0,0,0,0,`,
      );
    }

    return rows.join('\n');
  }

  async exportPdf(month: number, year: number): Promise<string> {
    const report = await this.getMonthlyReport(month, year);

    // Generate a simple CSV-like report for PDF (in production, use a PDF library)
    const rows: string[] = [];
    rows.push(
      `LAPORAN PPN - Periode: ${String(month).padStart(2, '0')}/${year}`,
    );
    rows.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
    rows.push('');
    rows.push('No,Nomor Faktur,Tanggal,NPWP,Nama Client,DPP,PPN,Status');

    report.invoices.forEach((inv, idx) => {
      rows.push(
        `${idx + 1},"${inv.taxInvoiceNumber}",${inv.transactionDate.split('T')[0]},"${inv.clientNpwp}","${inv.clientName}",${inv.dpp},${inv.ppnAmount},${inv.status}`,
      );
    });

    rows.push('');
    rows.push(`Total DPP: ${report.totalDpp}`);
    rows.push(`Total PPN: ${report.totalPpn}`);

    return rows.join('\n');
  }

  private validateTaxInvoice(inv: TaxInvoiceTypeOrmEntity): string[] {
    const errors: string[] = [];

    // NPWP format: 15 digits (or 16 for new format)
    const npwpClean = inv.clientNpwp.replace(/[.\-]/g, '');
    if (!/^\d{15,16}$/.test(npwpClean)) {
      errors.push(
        `Invalid NPWP format: "${inv.clientNpwp}" (must be 15-16 digits)`,
      );
    }

    // Tax invoice number format: 3 groups of digits (e.g., 010.000-24.00000001)
    const taxNumClean = inv.taxInvoiceNumber.replace(/[.\-]/g, '');
    if (!/^\d{13,16}$/.test(taxNumClean)) {
      errors.push(
        `Invalid tax invoice number format: "${inv.taxInvoiceNumber}"`,
      );
    }

    // DPP must be positive
    if (Number(inv.dpp) <= 0) {
      errors.push('DPP must be greater than 0');
    }

    // PPN should be ~11% of DPP (with tolerance)
    const expectedPpn = Number(inv.dpp) * 0.11;
    const actualPpn = Number(inv.ppnAmount);
    if (Math.abs(actualPpn - expectedPpn) > 1) {
      errors.push(
        `PPN amount (${actualPpn}) doesn't match 11% of DPP (expected ~${Math.round(expectedPpn)})`,
      );
    }

    return errors;
  }
}
