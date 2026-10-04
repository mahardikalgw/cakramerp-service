import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces';

/** Palette shared by the table-master and form-master layouts. */
export const COLORS = {
  navy: '#2C3E50',
  navyText: '#FFFFFF',
  zebra: '#F4F6F8',
  border: '#D5DBE1',
  muted: '#6B7280',
} as const;

/** Shared style tokens (mirrors the JRXML normalizer's `<style>` set). */
export const PDF_STYLES: StyleDictionary = {
  Title: { fontSize: 18, bold: true, color: COLORS.navy },
  Subtitle: { fontSize: 12, color: COLORS.navy },
  SectionLabel: { fontSize: 10, bold: true, color: COLORS.navy },
  Header: { fontSize: 9, bold: true, color: COLORS.navyText },
  Body: { fontSize: 9, color: '#222222' },
  Small: { fontSize: 8, color: COLORS.muted },
  Note: { fontSize: 7, italics: true, color: COLORS.muted },
} as unknown as StyleDictionary;

export const DEFAULT_PAGE_MARGINS: [number, number, number, number] = [
  45, 60, 45, 55,
];

export const DEFAULT_FONT = 'Roboto';

/** Standard footer/header chrome applied to every generated document. */
export interface DocChrome {
  title: string;
  subtitleLines?: string[];
  footerNote?: string;
}

/**
 * Build a complete `TDocumentDefinitions` with shared styles and page chrome.
 * Templates only supply the body content.
 */
export function buildDocDefinition(
  chrome: DocChrome,
  content: unknown,
): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: DEFAULT_PAGE_MARGINS,
    styles: PDF_STYLES,
    defaultStyle: { font: DEFAULT_FONT, fontSize: 9, color: '#222222' },
    content: content as TDocumentDefinitions['content'],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [45, 8, 45, 0],
      columns: [
        {
          text: chrome.footerNote ?? '',
          style: 'Note',
        },
        {
          text: `Halaman ${currentPage} dari ${pageCount}`,
          style: 'Note',
          alignment: 'right',
        },
      ],
    }),
  };
}
