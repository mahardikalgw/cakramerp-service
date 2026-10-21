import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DocumentGenerationHelper } from '../../src/modules/shared/infrastructure/document-generation/document-generation.helper';
import { MinioClientService } from '../../src/modules/shared/infrastructure/document-generation/minio-client.service';

/**
 * Live DB + MinIO round-trip for in-house document generation.
 *
 * Guarded: only runs when `RUN_DB_TESTS=1` so CI without a database is unaffected.
 *   RUN_DB_TESTS=1 pnpm exec jest --config ./test/jest-e2e.json \
 *     test/integration/document-generation.e2e-spec.ts
 */
const describeLive =
  process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

describeLive('document generation — DB + MinIO round trip', () => {
  let moduleRef: TestingModule;
  let helper: DocumentGenerationHelper;
  let minio: MinioClientService;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    await moduleRef.init();
    helper = moduleRef.get(DocumentGenerationHelper);
    minio = moduleRef.get(MinioClientService);
    dataSource = moduleRef.get(DataSource);
  }, 90_000);

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('renders a payload document, uploads it, then downloads valid PDF bytes', async () => {
    const doc = await helper.generateDocument({
      documentType: 'lab_invoice',
      entityId: '00000000-0000-0000-0000-0000000000aa',
      requestedBy: '00000000-0000-0000-0000-000000000000',
      outputFormat: 'pdf',
      parameters: {
        invoiceNumber: 'INV-IT-001',
        customerName: 'PT Integration',
        invoiceDate: '2026-10-05',
        dueDate: '2026-11-04',
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

    expect(doc.status).toBe('completed');
    expect(doc.minioPath).toContain(doc.minioBucket);

    const objectName = doc.minioPath.replace(`${doc.minioBucket}/`, '');
    const stream = await minio.getObjectStream(doc.minioBucket, objectName);
    const buffer = await streamToBuffer(stream);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');

    await dataSource.query('DELETE FROM generated_documents WHERE id = $1', [
      doc.id,
    ]);
    await minio.deleteFile(doc.minioBucket, objectName);
  }, 60_000);

  it('renders a SQL-backed document from a real entity and replaces it on regeneration', async () => {
    const rows = await dataSource.query('SELECT id FROM sales_orders LIMIT 1');
    if (rows.length === 0) {
      return; // no seed data available in this database
    }
    const entityId = rows[0].id;

    const first = await helper.generateDocument({
      documentType: 'sales_order',
      entityId,
      outputFormat: 'pdf',
    });
    expect(first.status).toBe('completed');

    const second = await helper.generateDocument({
      documentType: 'sales_order',
      entityId,
      outputFormat: 'pdf',
    });
    expect(second.status).toBe('completed');

    // supersede semantics (Q3=B): only the newest row survives
    const remaining = await dataSource.query(
      'SELECT id FROM generated_documents WHERE document_type = $1 AND entity_id = $2',
      ['sales_order', entityId],
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);

    for (const doc of [first, second]) {
      const objectName = doc.minioPath.replace(`${doc.minioBucket}/`, '');
      await minio
        .deleteFile(doc.minioBucket, objectName)
        .catch(() => undefined);
    }
    await dataSource.query(
      'DELETE FROM generated_documents WHERE document_type = $1 AND entity_id = $2',
      ['sales_order', entityId],
    );
  }, 60_000);
});
