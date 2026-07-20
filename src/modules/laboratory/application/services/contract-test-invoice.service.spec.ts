import { ContractTestInvoiceService } from './contract-test-invoice.service';
import { ContractTestInvoice } from '../../domain/entities/contract-test-invoice.entity';

/**
 * Unit tests for ContractTestInvoiceService.generateForSchedule idempotency
 * guard and actorRole threading. The service is constructed with plain-object
 * mocks for its 7 constructor dependencies (in declaration order):
 *   repository, contractRepo, testResultRepo, contractSampleRepo,
 *   docHelper, minioService, activityLog
 */
describe('ContractTestInvoiceService.generateForSchedule', () => {
  /** Build a service instance with no-op mocks; per-test overrides applied below. */
  function buildService(overrides: {
    repository?: Record<string, jest.Mock>;
    contractRepo?: Record<string, jest.Mock>;
    testResultRepo?: Record<string, jest.Mock>;
    contractSampleRepo?: Record<string, jest.Mock>;
    docHelper?: Record<string, jest.Mock>;
    minioService?: Record<string, jest.Mock>;
    activityLog?: Record<string, jest.Mock>;
  }) {
    const repository = {
      findByScheduleId: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      getLastInvoiceNumber: jest.fn().mockResolvedValue(null),
      generateNextInvoiceNumber: jest.fn().mockResolvedValue('CTI-000001'),
      findById: jest.fn().mockResolvedValue(null),
      sumInitialFeeApplied: jest.fn().mockResolvedValue(0),
      ...overrides.repository,
    };
    const contractRepo = {
      findById: jest.fn(),
      ...overrides.contractRepo,
    };
    const testResultRepo = {
      findByContractId: jest.fn().mockResolvedValue([]),
      ...overrides.testResultRepo,
    };
    const contractSampleRepo = {
      findByContractId: jest.fn().mockResolvedValue([]),
      ...overrides.contractSampleRepo,
    };
    const docHelper = {
      generateAsync: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      getDownloadUrl: jest.fn(),
      ...overrides.docHelper,
    };
    const minioService = {
      uploadFile: jest.fn(),
      getPresignedUrl: jest.fn(),
      getPublicDownloadUrl: jest.fn(),
      ...overrides.minioService,
    };
    const activityLog = {
      log: jest.fn().mockResolvedValue(undefined),
      ...overrides.activityLog,
    };
    const testingServiceRepo = {
      findById: jest.fn().mockResolvedValue(null),
      ...overrides.testingServiceRepo,
    };
    const service = new ContractTestInvoiceService(
      repository as any,
      contractRepo as any,
      testResultRepo as any,
      contractSampleRepo as any,
      testingServiceRepo as any,
      docHelper as any,
      minioService as any,
      activityLog as any,
    );
    return { service, repository, contractRepo, activityLog };
  }

  const contractStub = {
    id: 'c1',
    billingType: 'contract',
    initialFee: 0,
    contractNumber: 'CN-1',
    customerName: 'Cust',
    testingRequestId: 'tr-1',
  };

  it('returns the existing invoice and does not save when one already exists for the schedule', async () => {
    const existingInvoice = { id: 'inv-existing', invoiceNumber: 'CTI-000001' };
    const { service, repository } = buildService({
      contractRepo: { findById: jest.fn().mockResolvedValue(contractStub) },
      repository: {
        findByScheduleId: jest.fn().mockResolvedValue([existingInvoice]),
        save: jest.fn(),
      },
    });

    const result = await service.generateForSchedule(
      'c1',
      'sch-1',
      'u1',
      'Name',
      'customer',
    );

    expect(result).toBe(existingInvoice);
    expect(result?.id).toBe('inv-existing');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('creates a new invoice and logs with performedByRole="customer" when none exists', async () => {
    const { service, repository, activityLog } = buildService({
      contractRepo: { findById: jest.fn().mockResolvedValue(contractStub) },
      testResultRepo: {
        findByContractId: jest.fn().mockResolvedValue([
          {
            id: 'tr-1',
            status: 'confirmed',
            scheduleId: 'sch-1',
            serviceName: 'Concrete',
            sampleCode: 'S-1',
            contractSampleId: 'cs-1',
          },
        ]),
      },
      contractSampleRepo: {
        findByContractId: jest
          .fn()
          .mockResolvedValue([{ id: 'cs-1', unitPrice: 100 }]),
      },
      repository: {
        findByScheduleId: jest.fn().mockResolvedValue([]),
        getLastInvoiceNumber: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockImplementation(async (invoice) => invoice),
        findById: jest.fn().mockResolvedValue({
          id: 'inv-new',
          invoiceNumber: 'CTI-000001',
        }),
      },
    });

    const result = await service.generateForSchedule(
      'c1',
      'sch-1',
      'u1',
      'Cust Name',
      'customer',
    );

    // Flush fire-and-forget microtasks (activityLog.log + generateInvoiceDocument)
    await new Promise((r) => setImmediate(r));

    expect(result).not.toBeNull();
    expect(repository.save).toHaveBeenCalledTimes(1);

    // The activity log entry must record the customer as the actor.
    expect(activityLog.log).toHaveBeenCalledTimes(1);
    const loggedArg = activityLog.log.mock.calls[0][0];
    expect(loggedArg.performedByRole).toBe('customer');
    expect(loggedArg.action).toBe('contract_test_invoice_generated');
  });

  it('defaults actorRole to admin when the 5th argument is omitted', async () => {
    const { service, activityLog } = buildService({
      contractRepo: { findById: jest.fn().mockResolvedValue(contractStub) },
      testResultRepo: {
        findByContractId: jest.fn().mockResolvedValue([
          {
            id: 'tr-1',
            status: 'confirmed',
            scheduleId: 'sch-1',
            serviceName: 'Concrete',
            sampleCode: 'S-1',
            contractSampleId: 'cs-1',
          },
        ]),
      },
      contractSampleRepo: {
        findByContractId: jest
          .fn()
          .mockResolvedValue([{ id: 'cs-1', unitPrice: 100 }]),
      },
      repository: {
        findByScheduleId: jest.fn().mockResolvedValue([]),
        getLastInvoiceNumber: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockImplementation(async (invoice) => invoice),
        findById: jest.fn().mockResolvedValue({
          id: 'inv-new',
          invoiceNumber: 'CTI-000001',
        }),
      },
    });

    await service.generateForSchedule('c1', 'sch-1', 'admin1', 'Admin');

    await new Promise((r) => setImmediate(r));

    expect(activityLog.log).toHaveBeenCalledTimes(1);
    const loggedArg = activityLog.log.mock.calls[0][0];
    expect(loggedArg.performedByRole).toBe('admin');
  });
});
