import { NotificationEventService } from './notification-event.service';

/**
 * Unit tests for NotificationEventService.onContractTestInvoiceIssued.
 *
 * Constructor deps (in order):
 *   notificationService, emailService, userRepo, customerRepo, configService
 */
describe('NotificationEventService.onContractTestInvoiceIssued', () => {
  function buildService(overrides: {
    notificationService?: Record<string, jest.Mock>;
    emailService?: Record<string, jest.Mock>;
    userRepo?: Record<string, jest.Mock>;
    customerRepo?: Record<string, jest.Mock>;
    configService?: Record<string, jest.Mock>;
  }) {
    const notificationService = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      ...overrides.notificationService,
    };
    const emailService = {
      buildContractTestInvoiceIssuedHtml: jest
        .fn()
        .mockReturnValue('<html>invoice</html>'),
      ...overrides.emailService,
    };
    const userRepo = {
      findById: jest.fn(),
      ...overrides.userRepo,
    };
    const customerRepo = {
      findById: jest.fn(),
      ...overrides.customerRepo,
    };
    const configService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
      ...overrides.configService,
    };
    const service = new NotificationEventService(
      notificationService as any,
      emailService as any,
      userRepo as any,
      customerRepo as any,
      configService as any,
    );
    return { service, notificationService, emailService };
  }

  const invoiceStub = {
    id: 'inv-1',
    invoiceNumber: 'CTI-000001',
    contractId: 'c1',
    testingScheduleId: 'sch-1',
    totalSamples: 5,
    totalAmount: 550,
    amountDue: 550,
  };
  const contractStub = {
    id: 'c1',
    contractNumber: 'CN-1',
    customerId: 'cust-1',
    customerName: 'Cust',
  };

  it('dispatches a contract_test_invoice_issued notification to the contract customer', async () => {
    const { service, notificationService, emailService } = buildService({
      customerRepo: {
        findById: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      },
      userRepo: {
        findById: jest.fn().mockResolvedValue({ email: 'cust@example.com' }),
      },
    });

    await service.onContractTestInvoiceIssued(
      invoiceStub as any,
      contractStub as any,
    );

    expect(notificationService.dispatch).toHaveBeenCalledTimes(1);
    const dispatched = notificationService.dispatch.mock.calls[0][0];
    expect(dispatched.eventType).toBe('contract_test_invoice_issued');
    expect(dispatched.recipientUserId).toBe('user-1');
    expect(dispatched.recipientEmail).toBe('cust@example.com');
    expect(dispatched.actionUrl).toBe(
      'http://localhost:3000/portal/lab/contract-test-invoices/inv-1',
    );
    expect(dispatched.actionLabel).toBe('View Invoice');
    expect(dispatched.entityType).toBe('invoice');
    expect(dispatched.entityId).toBe('inv-1');

    // Email HTML builder is fed the invoice + contract fields.
    expect(
      emailService.buildContractTestInvoiceIssuedHtml,
    ).toHaveBeenCalledTimes(1);
    const htmlArg =
      emailService.buildContractTestInvoiceIssuedHtml.mock.calls[0][0];
    expect(htmlArg.invoiceNumber).toBe('CTI-000001');
    expect(htmlArg.contractNumber).toBe('CN-1');
    expect(htmlArg.totalSamples).toBe(5);
    expect(htmlArg.amountDue).toBe('550');
    expect(htmlArg.actionUrl).toBe(
      'http://localhost:3000/portal/lab/contract-test-invoices/inv-1',
    );
  });

  it('does not throw and does not dispatch when the customer cannot be resolved', async () => {
    const { service, notificationService } = buildService({
      customerRepo: {
        // Orphaned contract: customer record missing / no userId.
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.onContractTestInvoiceIssued(
        invoiceStub as any,
        contractStub as any,
      ),
    ).resolves.toBeUndefined();

    expect(notificationService.dispatch).not.toHaveBeenCalled();
  });

  it('logs and swallows errors from dispatch instead of throwing (fire-and-forget safe)', async () => {
    const dispatchError = new Error('notification provider down');
    const { service, notificationService } = buildService({
      customerRepo: {
        findById: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      },
      userRepo: {
        findById: jest.fn().mockResolvedValue({ email: 'cust@example.com' }),
      },
      notificationService: {
        dispatch: jest.fn().mockRejectedValue(dispatchError),
      },
    });

    // Must NOT propagate the dispatch error.
    await expect(
      service.onContractTestInvoiceIssued(
        invoiceStub as any,
        contractStub as any,
      ),
    ).resolves.toBeUndefined();

    expect(notificationService.dispatch).toHaveBeenCalledTimes(1);
  });
});
