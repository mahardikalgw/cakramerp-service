import { ContractTestInvoiceTypeOrmRepository } from './contract-test-invoice-typeorm.repository';
import { ContractTestInvoice } from '../../domain/entities/contract-test-invoice.entity';

/**
 * Unit tests for ContractTestInvoiceTypeOrmRepository.findByScheduleId.
 *
 * The repository is constructed with a mocked DataSource whose getRepository
 * returns a fake TypeORM Repository supporting `find`. toDomain/toEntity are
 * real (exercised end-to-end) so we verify the mapping from entity → domain.
 */
describe('ContractTestInvoiceTypeOrmRepository.findByScheduleId', () => {
  function buildRepository(findImpl: () => Promise<any[]>) {
    const fakeRepo = { find: jest.fn(findImpl) };
    const fakeDataSource = {
      getRepository: jest.fn(() => fakeRepo),
    } as any;
    return new ContractTestInvoiceTypeOrmRepository(fakeDataSource);
  }

  it('returns an empty array when no invoice exists for the schedule', async () => {
    const repo = buildRepository(async () => []);

    const result = await repo.findByScheduleId('unknown-schedule');

    expect(result).toEqual([]);
    expect(
      fakeRepoFindWasCalledWith(repo, {
        where: { testingScheduleId: 'unknown-schedule' },
      }),
    ).toBe(true);
  });

  it('maps pre-seeded invoice rows to ContractTestInvoice domain entities', async () => {
    const seededEntity = {
      id: 'inv-1',
      invoiceNumber: 'CTI-000001',
      contractId: 'contract-1',
      testingScheduleId: 'sch-1',
      billingPeriodStart: new Date('2026-01-01'),
      billingPeriodEnd: new Date('2026-01-31'),
      totalSamples: 2,
      baseAmount: 1000,
      taxPercent: 11,
      taxAmount: 110,
      totalAmount: 1110,
      initialFeeApplied: 500,
      amountDue: 610,
      status: 'issued',
      dueDate: new Date('2026-03-01'),
      issuedAt: new Date('2026-01-31'),
      paidAt: null,
      paidAmount: null,
      invoiceDocumentUrl: null,
      paymentProofUrl: null,
      paymentProofFilename: null,
      paymentProofUploadedAt: null,
      paymentVerifiedAt: null,
      paymentVerifiedBy: null,
      paymentVerifiedByName: null,
      notes: null,
      lines: [],
      createdAt: new Date('2026-01-31'),
      updatedAt: new Date('2026-01-31'),
    };

    const repo = buildRepository(async () => [seededEntity]);

    const result = await repo.findByScheduleId('sch-1');

    expect(result).toHaveLength(1);
    const invoice = result[0];
    expect(invoice).toBeInstanceOf(ContractTestInvoice);
    expect(invoice.id).toBe('inv-1');
    expect(invoice.invoiceNumber).toBe('CTI-000001');
    expect(invoice.contractId).toBe('contract-1');
    expect(invoice.testingScheduleId).toBe('sch-1');
    expect(invoice.totalAmount).toBe(1110);
    expect(invoice.amountDue).toBe(610);
    expect(invoice.status).toBe('issued');
    expect(invoice.lines).toEqual([]);
  });

  /** Helper: inspect the arguments passed to the mocked `find`. */
  function fakeRepoFindWasCalledWith(
    repo: ContractTestInvoiceTypeOrmRepository,
    expected: { where: Record<string, unknown> },
  ): boolean {
    // The repository stores `repository` in a protected field; access via any.
    const calls = (repo as any).repository.find.mock.calls as unknown[][];
    return calls.some(
      (args) =>
        args[0] &&
        (args[0] as any).where &&
        (args[0] as any).where.testingScheduleId ===
          expected.where.testingScheduleId,
    );
  }
});
