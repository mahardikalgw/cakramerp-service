import { PdfmakeAdapter } from './infrastructure/pdf/pdfmake.adapter';
import { ExcelJsAdapter } from './infrastructure/xlsx/exceljs.adapter';
import { PayloadDocumentRenderer } from './infrastructure/strategies/payload.document-renderer';
import { SqlDataDocumentRenderer } from './infrastructure/strategies/sql-data.document-renderer';
import { DocumentRendererRegistry } from './application/document-renderer.registry';
import { TEMPLATES } from './templates';
import { UnsupportedDocumentTypeError } from './domain/document-generation.errors';
import { DOCUMENT_TYPES } from './document-generation.constants';
import {
  formatCurrencyId,
  formatDateId,
  formatNumberId,
} from './infrastructure/formatting/id-format';

describe('Document generation (in-house)', () => {
  const pdf = new PdfmakeAdapter();
  const excel = new ExcelJsAdapter();
  const payload = new PayloadDocumentRenderer(pdf);
  const sql = new SqlDataDocumentRenderer(pdf, {} as never);
  const registry = new DocumentRendererRegistry(payload, sql);

  it('renders a payload-driven PDF to a valid buffer', async () => {
    const result = await payload.render({
      documentType: DOCUMENT_TYPES.LAB_INVOICE,
      entityId: '11111111-1111-1111-1111-111111111111',
      outputFormat: 'pdf',
      parameters: {
        invoiceNumber: 'INV-001',
        customerName: 'PT Contoh',
        invoiceDate: '2026-10-04',
        dueDate: '2026-11-03',
        subtotal: '1.000,00',
        taxPercent: '11',
        taxAmount: '110,00',
        totalAmount: '1.110,00',
      },
      lines: [
        {
          description: 'Uji Beton',
          quantity: '1',
          unitPrice: '1.000,00',
          total: '1.000,00',
        },
      ],
    });
    expect(result.size).toBeGreaterThan(0);
    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('applies a draft watermark without breaking rendering', async () => {
    const result = await payload.render({
      documentType: DOCUMENT_TYPES.LAB_PURCHASE_ORDER,
      entityId: '22222222-2222-2222-2222-222222222222',
      parameters: { poNumber: 'PO-001', customerName: 'PT Contoh' },
      lines: [{ serviceName: 'Uji', sampleCode: 'S-1', quantity: '1' }],
      watermark: 'DRAFT',
    });
    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('resolves renderers and rejects unknown document types', () => {
    expect(registry.resolve(DOCUMENT_TYPES.LAB_INVOICE)).toBe(payload);
    expect(registry.resolve(DOCUMENT_TYPES.PAYSLIP)).toBe(sql);
    expect(() => registry.resolve('does_not_exist')).toThrow(
      UnsupportedDocumentTypeError,
    );
    expect(registry.supportedTypes()).toContain(DOCUMENT_TYPES.SALES_INVOICE);
  });

  it('writes an XLSX workbook buffer', async () => {
    const workbook = excel.newWorkbook();
    workbook.addWorksheet('Sheet1').addRow(['hello', 'world']);
    const buffer = await excel.toBuffer(workbook);
    expect(buffer.length).toBeGreaterThan(0);
    // XLSX is a zip archive: starts with PK
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
  });

  it('renders every registered template to a valid PDF', async () => {
    const model = {
      parameters: {
        invoiceNumber: 'X',
        poNumber: 'X',
        contractNumber: 'X',
        customerName: 'PT Uji',
        subtotal: '1.000,00',
        taxPercent: '11',
        taxAmount: '110,00',
        totalAmount: '1.110,00',
        period: 'Oktober 2026',
      },
      lines: [
        {
          description: 'Uji',
          serviceName: 'Uji',
          sampleCode: 'S-1',
          quantity: '1',
          unitPrice: '1.000,00',
          total: '1.000,00',
          parameter: 'pH',
          value: '7',
        },
      ],
    };
    for (const [type, template] of Object.entries(TEMPLATES)) {
      const definition = template(model);
      const buffer = await pdf.render(definition);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(buffer.length).toBeGreaterThan(0);
      // keep the assertion message useful on failure
      expect(type).toBeTruthy();
    }
  });

  it('formats numbers and dates in Indonesian', () => {
    expect(formatNumberId(1234567)).toBe('1.234.567');
    expect(formatCurrencyId(1234.5)).toBe('1.234,50');
    expect(formatDateId('2026-10-04')).toBe('4 Oktober 2026');
  });

  /**
   * SC-005 parity guard: fields the legacy JRXML templates rendered MUST reach
   * the new document definition. These regressions were found during the
   * side-by-side parity review (T075) and must not silently return.
   */
  it('keeps legacy lab-contract and certificate fields in the rendered model', () => {
    const contract = JSON.stringify(
      TEMPLATES[DOCUMENT_TYPES.LAB_CONTRACT]({
        parameters: {
          contractNumber: 'CT-1',
          customerName: 'PT Uji',
          customerAddress: 'Jl. Contoh 1',
          projectName: 'Proyek A',
          totalQuota: '10',
          usedQuota: '0',
          remainingQuota: '10',
          baseAmount: '1.000,00',
          taxPercent: '11%',
          taxAmount: '110,00',
          totalAmount: '1.110,00',
          scopeOfTesting: 'Lingkup lengkap',
          isCash: 'false',
          paymentTerms: 'Bulanan',
          downPaymentAmount: '500,00',
          dpDueDate: '2026-11-01',
          labSignatureName: 'Lab Sig',
          customerSignatureName: 'Cust Sig',
        },
        lines: [
          {
            serviceName: 'Uji',
            sampleCode: 'S-1',
            sampleQuantity: '2',
            unitPrice: '500,00',
            totalPrice: '1.000,00',
          },
        ],
      }),
    );
    for (const v of [
      'Lingkup lengkap',
      'Bulanan',
      '500,00',
      'Lab Sig',
      'Cust Sig',
      '1.000,00',
    ]) {
      expect(contract).toContain(v);
    }

    const cert = JSON.stringify(
      TEMPLATES[DOCUMENT_TYPES.TEST_RESULT_CERTIFICATE]({
        parameters: {
          certificateNumber: 'CERT-1',
          sampleCode: 'S-9',
          resultNumber: '7',
          sampleUnit: '3',
          customerName: 'PT Uji',
          submittedByName: 'Penerima',
          testingDate: '2026-10-03',
          createdDate: '2026-10-01',
          berat: '1200',
          luas: '10',
          retakan: 'tidak ada',
          mutu: 'K-300',
          produk: 'Beton',
          resultNotes: 'Lulus',
        },
        lines: [
          { parameter: 'Kuat Tekan', value: '30', unit: 'MPa', method: 'SNI' },
        ],
      }),
    );
    for (const v of [
      'Penerima',
      '3 Oktober 2026',
      '1 Oktober 2026',
      '1200',
      'K-300',
      'Beton',
      'Lulus',
      'Kuat Tekan',
      'MPa',
    ]) {
      expect(cert).toContain(v);
    }
  });
});
