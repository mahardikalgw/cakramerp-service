import * as fs from 'fs';
import * as path from 'path';
import type { Workbook, Worksheet } from 'exceljs';

const TEMPLATE_PATH = path.join(
  __dirname,
  'assets',
  'template_report_lab.xlsx',
);

export const SCHEDULE_DATA_START_ROW = 14;
export const SCHEDULE_BATCH_SIZE = 10;
export const SCHEDULE_FIXED_COL_COUNT = 10; // columns B-K

export function loadScheduleTemplate(): Buffer {
  return fs.readFileSync(TEMPLATE_PATH);
}

/**
 * ExcelJS has no native `cloneSheet`, so copy values, styles, widths, merges
 * and page setup from a source sheet into a freshly added worksheet.
 */
export function cloneWorksheet(
  workbook: Workbook,
  source: Worksheet,
  name: string,
): Worksheet {
  const target = workbook.addWorksheet(name);

  target.pageSetup = { ...source.pageSetup };
  target.views = JSON.parse(JSON.stringify(source.views ?? []));

  source.columns?.forEach((column, index) => {
    const targetColumn = target.getColumn(index + 1);
    if (column.width) targetColumn.width = column.width;
  });

  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const targetRow = target.getRow(rowNumber);
    if (row.height) targetRow.height = row.height;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);
      targetCell.value = cell.value as never;
      targetCell.style = JSON.parse(JSON.stringify(cell.style ?? {}));
    });
  });

  const merges: string[] = Array.isArray((source as any).model?.merges)
    ? (source as any).model.merges
    : Object.keys((source as any)._merges ?? {});
  for (const range of merges) {
    try {
      target.mergeCells(range);
    } catch {
      // ignore overlapping/invalid merge ranges
    }
  }

  return target;
}

export function columnLetter(columnNumber: number): string {
  let n = columnNumber;
  let letters = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
