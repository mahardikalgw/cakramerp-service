import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import pdfMake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { applyWatermark } from './watermark';

interface FontFiles {
  normal: string;
  bold: string;
  italics: string;
  bolditalics: string;
}

interface ResolvedFonts {
  fonts: Record<string, FontFiles>;
  family: string;
}

/**
 * Resolve the document font: prefer bundled DejaVu Sans (parity with the JRXML
 * templates) and fall back to the Roboto font shipped with pdfmake.
 */
function resolveFonts(): ResolvedFonts {
  const localDir = path.join(__dirname, 'fonts');
  const dejavu: FontFiles = {
    normal: path.join(localDir, 'DejaVuSans.ttf'),
    bold: path.join(localDir, 'DejaVuSans-Bold.ttf'),
    italics: path.join(localDir, 'DejaVuSans-Oblique.ttf'),
    bolditalics: path.join(localDir, 'DejaVuSans-BoldOblique.ttf'),
  };
  if (Object.values(dejavu).every((p) => fs.existsSync(p))) {
    return { fonts: { DejaVuSans: dejavu }, family: 'DejaVuSans' };
  }

  const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
  const robotoDir = path.join(pdfmakeDir, 'fonts', 'Roboto');
  return {
    fonts: {
      Roboto: {
        normal: path.join(robotoDir, 'Roboto-Regular.ttf'),
        bold: path.join(robotoDir, 'Roboto-Medium.ttf'),
        italics: path.join(robotoDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(robotoDir, 'Roboto-MediumItalic.ttf'),
      },
    },
    family: 'Roboto',
  };
}

/** Thin wrapper around pdfmake that renders a document definition to a Buffer. */
@Injectable()
export class PdfmakeAdapter {
  private readonly logger = new Logger(PdfmakeAdapter.name);
  private readonly family: string;

  constructor() {
    const { fonts, family } = resolveFonts();
    pdfMake.setFonts(fonts as never);
    this.family = family;
    // Local files allowed (nothing sensitive is read by templates); URL access
    // denied so report definitions cannot fetch remote resources.
    pdfMake.setLocalAccessPolicy?.(() => true);
    pdfMake.setUrlAccessPolicy?.(() => false);
    this.logger.log(`PDF font provider initialized with "${family}"`);
  }

  async render(
    definition: TDocumentDefinitions,
    watermark?: string,
  ): Promise<Buffer> {
    let finalDefinition: TDocumentDefinitions = {
      ...definition,
      defaultStyle: {
        ...(definition.defaultStyle ?? {}),
        font: this.family,
      },
    };
    if (watermark && watermark.trim()) {
      finalDefinition = applyWatermark(finalDefinition, watermark.trim());
    }
    const pdf = pdfMake.createPdf(finalDefinition);
    return pdf.getBuffer();
  }
}
