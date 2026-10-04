import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExcelJsAdapter } from '../infrastructure/xlsx/exceljs.adapter';

/**
 * Contract-total spreadsheet report. The original service source was not
 * available in the workspace (research R6), so this is a functional
 * reconstruction driven by the contract and its test results.
 */
@Injectable()
export class ContractTotalReportBuilder {
  constructor(
    private readonly excel: ExcelJsAdapter,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async build(contractId: string): Promise<Buffer> {
    const contracts = await this.dataSource.query(
      `SELECT contract_number, customer_name, project_name, project_location
         FROM lab_contracts WHERE id = CAST($1 AS uuid)`,
      [contractId],
    );
    const contract = contracts[0] ?? {};

    const rows = await this.dataSource.query(
      `SELECT tr.service_name, COUNT(*)::int AS total_samples
         FROM test_results tr
        WHERE tr.contract_id = CAST($1 AS uuid)
        GROUP BY tr.service_name
        ORDER BY tr.service_name`,
      [contractId],
    );

    const workbook = await this.excel.newWorkbook();
    const sheet = workbook.addWorksheet('Total');
    sheet.addRow(['Laporan Total Kontrak']);
    sheet.addRow(['No. Kontrak', contract.contract_number ?? '-']);
    sheet.addRow(['Customer', contract.customer_name ?? '-']);
    sheet.addRow(['Proyek', contract.project_name ?? '-']);
    sheet.addRow(['Lokasi', contract.project_location ?? '-']);
    sheet.addRow([]);
    const header = sheet.addRow(['No', 'Layanan Uji', 'Jumlah Sampel']);
    header.font = { bold: true };
    rows.forEach((r: any, index: number) => {
      sheet.addRow([index + 1, r.service_name ?? '-', r.total_samples ?? 0]);
    });
    sheet.getColumn(2).width = 40;
    sheet.getColumn(3).width = 18;

    return this.excel.toBuffer(workbook);
  }
}
