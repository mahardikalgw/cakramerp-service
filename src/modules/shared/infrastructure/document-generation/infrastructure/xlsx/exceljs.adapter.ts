import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

/** Wrapper around ExcelJS for loading templates and writing workbooks. */
@Injectable()
export class ExcelJsAdapter {
  async load(buffer: Buffer): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    return workbook;
  }

  async toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data as ArrayBuffer);
  }

  newWorkbook(): ExcelJS.Workbook {
    return new ExcelJS.Workbook();
  }
}
