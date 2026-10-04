import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { buildDocDefinition, COLORS } from '../infrastructure/pdf/pdf-styles';
import type { RenderViewModel } from '../domain/document-render.types';

export type TemplateBuilder = (model: RenderViewModel) => TDocumentDefinitions;

export interface TableColumn {
  header: string;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
}

/** Two-column label/value block used above tables and in form layouts. */
function infoBlock(pairs: [string, string][]): Content {
  return {
    margin: [0, 8, 0, 0],
    columns: pairs.map(([label, value]) => ({
      width: '*',
      stack: [
        { text: label, style: 'SectionLabel' },
        { text: value, style: 'Body', margin: [0, 1, 0, 0] },
      ],
    })),
  } as Content;
}

/**
 * Table-master layout: title, optional info block, a navy-headed grid and an
 * optional totals block. Mirrors the 15 grid-style JRXML templates.
 */
export function tableMaster(opts: {
  title: string;
  subtitleLines?: string[];
  info?: [string, string][];
  columns: TableColumn[];
  rows: (string | number)[][];
  totals?: [string, string][];
  note?: string;
  footerNote?: string;
}): TDocumentDefinitions {
  const content: any[] = [{ text: opts.title, style: 'Title' }];

  for (const line of opts.subtitleLines ?? []) {
    content.push({ text: line, style: 'Subtitle', margin: [0, 2, 0, 0] });
  }
  if (opts.info?.length) {
    content.push(infoBlock(opts.info));
  }

  const headerRow = opts.columns.map((c) => ({
    text: c.header,
    style: 'Header',
    alignment: c.align ?? 'left',
    fillColor: COLORS.navy,
    margin: [4, 4, 4, 4],
  }));

  const bodyRows = opts.rows.map((row, rowIndex) =>
    opts.columns.map((c, colIndex) => ({
      text:
        row[colIndex] === null || row[colIndex] === undefined
          ? '-'
          : String(row[colIndex]),
      style: 'Body',
      alignment: c.align ?? 'left',
      fillColor: rowIndex % 2 === 1 ? COLORS.zebra : undefined,
      margin: [4, 3, 4, 3],
    })),
  );

  content.push({
    margin: [0, 12, 0, 0],
    table: {
      headerRows: 1,
      widths: opts.columns.map((c) => c.width ?? '*'),
      body: [headerRow, ...bodyRows],
    },
    layout: {
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
    },
  });

  if (opts.totals?.length) {
    content.push({
      margin: [0, 10, 0, 0],
      alignment: 'right',
      table: {
        widths: [120, 120],
        body: opts.totals.map(([label, value]) => [
          {
            text: label,
            style: 'SectionLabel',
            alignment: 'right',
            margin: [0, 2, 6, 2],
          },
          {
            text: value,
            style: 'Body',
            alignment: 'right',
            margin: [0, 2, 0, 2],
          },
        ]),
      },
      layout: 'noBorders',
    });
  }

  if (opts.note) {
    content.push({ text: opts.note, style: 'Note', margin: [0, 12, 0, 0] });
  }

  return buildDocDefinition(
    { title: opts.title, footerNote: opts.footerNote },
    content,
  );
}

/**
 * Form-master layout: single-column label/value sections. Mirrors the payslip
 * and self-service templates.
 */
export function formMaster(opts: {
  title: string;
  subtitleLines?: string[];
  sections: { heading?: string; fields: [string, string][] }[];
  note?: string;
  footerNote?: string;
}): TDocumentDefinitions {
  const content: any[] = [{ text: opts.title, style: 'Title' }];

  for (const line of opts.subtitleLines ?? []) {
    content.push({ text: line, style: 'Subtitle', margin: [0, 2, 0, 0] });
  }

  for (const section of opts.sections) {
    content.push({
      margin: [0, 14, 0, 0],
      table: {
        widths: [170, '*'],
        body: section.fields.map(([label, value]) => [
          { text: label, style: 'SectionLabel', margin: [0, 4, 8, 4] },
          { text: value, style: 'Body', margin: [0, 4, 0, 4] },
        ]),
      },
      layout: {
        hLineColor: () => COLORS.border,
        hLineWidth: (i: number) => (i === 0 ? 1 : 0.5),
        vLineWidth: () => 0,
      },
    });
    if (section.heading) {
      // heading rendered above the section rows when provided
      content.splice(content.length - 1, 0, {
        text: section.heading,
        style: 'SectionLabel',
        margin: [0, 14, 0, 0],
      });
    }
  }

  if (opts.note) {
    content.push({ text: opts.note, style: 'Note', margin: [0, 14, 0, 0] });
  }

  return buildDocDefinition(
    { title: opts.title, footerNote: opts.footerNote },
    content,
  );
}

/** Convenience: stringify a value for a table cell. */
export function cell(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}
