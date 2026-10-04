import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExcelJsAdapter } from '../infrastructure/xlsx/exceljs.adapter';

/**
 * Sample/result spreadsheet report. The original service source was not
 * available in the workspace (research R6), so this is a functional
 * reconstruction driven by the test result and its parameters.
 */
@Injectable()
export class SampleReportBuilder {
  constructor(
    private readonly excel: ExcelJsAdapter,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async build(resultId: string): Promise<Buffer> {
    const results = await this.dataSource.query(
      `SELECT sample_code, mutu, produk, service_name, result_data
         FROM test_results WHERE id = CAST($1 AS uuid)`,
      [resultId],
    );
    const result = results[0] ?? {};

    let parameters: { parameter?: string; value?: unknown }[] = [];
    if (result.result_data) {
      try {
        const parsed =
          typeof result.result_data === 'string'
            ? JSON.parse(result.result_data)
            : result.result_data;
        if (Array.isArray(parsed?.parameters)) parameters = parsed.parameters;
      } catch {
        parameters = [];
      }
    }

    const workbook = await this.excel.newWorkbook();
    const sheet = workbook.addWorksheet('Sampel');
    sheet.addRow(['Laporan Hasil Sampel']);
    sheet.addRow(['Kode Sampel', result.sample_code ?? '-']);
    sheet.addRow(['Mutu', result.mutu ?? '-']);
    sheet.addRow(['Produk', result.produk ?? '-']);
    sheet.addRow(['Layanan Uji', result.service_name ?? '-']);
    sheet.addRow([]);
    const header = sheet.addRow(['No', 'Parameter', 'Hasil']);
    header.font = { bold: true };
    parameters.forEach((p, index) => {
      sheet.addRow([
        index + 1,
        String(p.parameter ?? `Parameter ${index + 1}`),
        String(p.value ?? '-'),
      ]);
    });
    sheet.getColumn(2).width = 40;
    sheet.getColumn(3).width = 25;

    return this.excel.toBuffer(workbook);
  }
}
