import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExcelJsAdapter } from '../infrastructure/xlsx/exceljs.adapter';
import {
  SCHEDULE_BATCH_SIZE,
  SCHEDULE_DATA_START_ROW,
  SCHEDULE_FIXED_COL_COUNT,
  cloneWorksheet,
  columnLetter,
  loadScheduleTemplate,
} from './excel-helpers';

interface ScheduleResultRow {
  sample_code: string;
  mutu: string;
  produk: string;
  created_date: string;
  testing_date: string;
  umur: string;
  berat: unknown;
  luas: unknown;
  result_data: unknown;
  parameters: { name: string; value: string }[];
  retakan: unknown;
}

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatDate(value: unknown): string {
  if (!value) return '-';
  const raw = String(value).trim().slice(0, 10);
  const parts = raw.split('-').map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return '-';
  const [year, month, day] = parts;
  return `${day} ${MONTHS_ID[month - 1] ?? ''} ${year}`;
}

/**
 * Rebuilds the laboratory schedule spreadsheet in-house (FR-009). Reproduces
 * the Java/Apache POI behaviour: one `perbacth_N` sheet per 10 rows, landscape
 * A4, print area `$B$1:$<last>$38`, dynamic parameter columns then `retakan`.
 */
@Injectable()
export class ScheduleReportBuilder {
  private readonly logger = new Logger(ScheduleReportBuilder.name);

  constructor(
    private readonly excel: ExcelJsAdapter,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async build(scheduleId: string): Promise<Buffer> {
    const scheduleRows = await this.dataSource.query(
      `SELECT c.customer_name, c.project_name, c.project_location, c.id AS contract_id
         FROM testing_schedules s
         LEFT JOIN lab_contracts c ON c.id = s.contract_id
        WHERE s.id = CAST($1 AS uuid)`,
      [scheduleId],
    );
    const scheduleInfo = scheduleRows[0] ?? {};

    const rawResults = await this.dataSource.query(
      `SELECT tr.sample_code, tr.mutu, tr.produk, tr.created_date, tr.testing_date,
              tr.result_data, tr.sample_unit, tr.service_name
         FROM test_results tr
        WHERE tr.schedule_id = CAST($1 AS uuid)
          AND tr.status IN ('submitted', 'confirmed')
        ORDER BY tr.sample_code, tr.sample_unit`,
      [scheduleId],
    );

    const serviceName = rawResults[0]?.service_name ?? '';
    let sniInfo = '';
    let specimenInfo = '';
    if (serviceName) {
      try {
        const svcRows = await this.dataSource.query(
          `SELECT sni, description FROM testing_services WHERE name = $1 LIMIT 1`,
          [serviceName],
        );
        const svc = svcRows[0] ?? {};
        if (svc.sni) sniInfo = String(svc.sni);
        const desc = svc.description ? String(svc.description) : '';
        if (desc.includes('benda uji') || desc.includes('dengan')) {
          const withIdx = desc.indexOf('dengan');
          if (withIdx > 0) {
            const after = desc.substring(withIdx + 6).trim();
            const sniIdx = after.indexOf('SNI');
            specimenInfo =
              sniIdx > 0
                ? after.substring(0, sniIdx).replace('sesuai', '').trim()
                : after.replace(/\.$/, '').trim();
          }
        }
        if (!sniInfo && desc.includes('SNI')) {
          const sniIdx = desc.indexOf('SNI');
          sniInfo = desc.substring(sniIdx).replace(/\.$/, '').trim();
        }
      } catch {
        this.logger.warn(
          `Could not fetch testing service info for ${serviceName}`,
        );
      }
    }

    const allParamNames: string[] = [];
    const data: ScheduleResultRow[] = rawResults.map((row: any) => {
      let resultData: any = {};
      if (row.result_data) {
        try {
          resultData =
            typeof row.result_data === 'string'
              ? JSON.parse(row.result_data)
              : row.result_data;
        } catch {
          resultData = {};
        }
      }
      let umur = '-';
      if (row.created_date && row.testing_date) {
        const created = new Date(String(row.created_date).slice(0, 10));
        const testing = new Date(String(row.testing_date).slice(0, 10));
        const days = Math.round(
          (testing.getTime() - created.getTime()) / 86_400_000,
        );
        if (days >= 0) umur = String(days);
      }
      const parameters: { name: string; value: string }[] = [];
      const params = resultData?.parameters;
      if (Array.isArray(params)) {
        params.forEach((p: any, index: number) => {
          const name = String(p?.parameter ?? `Parameter ${index + 1}`);
          const value = String(p?.value ?? '-');
          parameters.push({ name, value });
          if (!allParamNames.includes(name)) allParamNames.push(name);
        });
      }
      return {
        sample_code: row.sample_code ?? '-',
        mutu: row.mutu ?? '-',
        produk: row.produk ?? '-',
        created_date: formatDate(row.created_date),
        testing_date: formatDate(row.testing_date),
        umur,
        berat: resultData?.berat ?? '-',
        luas: resultData?.luas ?? '-',
        result_data: row.result_data,
        parameters,
        retakan: resultData?.retakan ?? '-',
      } as ScheduleResultRow;
    });

    if (data.length === 0) {
      throw new Error('No data found for schedule');
    }

    const workbook = await this.excel.load(loadScheduleTemplate());
    const templateSheet = workbook.getWorksheet('perbacth');
    if (!templateSheet) {
      throw new Error("Sheet 'perbacth' not found in schedule template");
    }

    const totalBatches = Math.ceil(data.length / SCHEDULE_BATCH_SIZE);
    const totalColumns = SCHEDULE_FIXED_COL_COUNT + allParamNames.length + 1; // + retakan

    for (let batch = 0; batch < totalBatches; batch++) {
      const sheetName = `perbacth_${batch + 1}`;
      let sheet;
      if (batch === 0) {
        sheet = templateSheet;
        sheet.name = sheetName;
      } else {
        sheet = cloneWorksheet(workbook, templateSheet, sheetName);
      }

      sheet.pageSetup = {
        ...sheet.pageSetup,
        orientation: 'landscape',
        paperSize: 9,
        printArea: `$B$1:$${columnLetter(totalColumns + 1)}$38`,
      };

      const start = batch * SCHEDULE_BATCH_SIZE;
      const batchRows = data.slice(start, start + SCHEDULE_BATCH_SIZE);

      // dynamic parameter headers (row 13) and values (rows 14+)
      allParamNames.forEach((name, index) => {
        sheet.getCell(13, SCHEDULE_FIXED_COL_COUNT + 2 + index).value = name;
      });
      sheet.getCell(
        13,
        SCHEDULE_FIXED_COL_COUNT + 2 + allParamNames.length,
      ).value = 'Retakan';

      batchRows.forEach((row, rowIndex) => {
        const excelRow = SCHEDULE_DATA_START_ROW + rowIndex;
        const values: Record<number, unknown> = {
          2: rowIndex + 1,
          3: row.sample_code,
          5: row.mutu,
          6: row.produk,
          7: row.created_date,
          8: row.testing_date,
          9: row.umur,
          10: row.berat,
          11: row.luas,
        };
        Object.entries(values).forEach(([col, value]) => {
          sheet.getCell(excelRow, Number(col)).value = value as never;
        });
        allParamNames.forEach((name, index) => {
          const value =
            row.parameters.find((p) => p.name === name)?.value ?? '-';
          sheet.getCell(excelRow, SCHEDULE_FIXED_COL_COUNT + 2 + index).value =
            value;
        });
        sheet.getCell(
          excelRow,
          SCHEDULE_FIXED_COL_COUNT + 2 + allParamNames.length,
        ).value = row.retakan as never;
      });

      const customer = sheet.getCell('C1');
      if (!customer.value) customer.value = scheduleInfo.customer_name ?? '';

      // Surface SNI / specimen metadata when the template leaves these blank.
      const sniCell = sheet.getCell('C2');
      if (!sniCell.value) sniCell.value = sniInfo;
      const specimenCell = sheet.getCell('C3');
      if (!specimenCell.value) specimenCell.value = specimenInfo;
    }

    // remove the original template sheet if it was renamed (batch 0 reused it)
    return this.excel.toBuffer(workbook);
  }
}
