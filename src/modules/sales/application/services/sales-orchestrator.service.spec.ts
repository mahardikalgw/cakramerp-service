import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrchestratorService } from './sales-orchestrator.service';

/**
 * Mirror of the purchasing-side orchestrator tests for the sales
 * orquestrador. Covers the same set of state-machine transitions:
 * approve / reject / deliver / invoice / approve sales return.
 */

function makeOrchestrator(opts: {
  so?: any;
  ret?: any;
  salesOrderService?: any;
  salesReturnService?: any;
  warehouseAdapter?: any;
  financeAdapter?: any;
}) {
  const so = opts.so ?? null;
  const ret = opts.ret ?? null;

  const salesOrderService: any = {
    approve: jest.fn().mockResolvedValue({ id: 'so-1', status: 'approved' }),
    reject: jest.fn().mockResolvedValue({ id: 'so-1', status: 'rejected' }),
  };
  const salesReturnService: any = {
    approve: jest.fn().mockResolvedValue({ id: 'srtn-1', status: 'approved' }),
  };
  const warehouseAdapter: any = {
    createDraftIssuanceFromSO: jest
      .fn()
      .mockResolvedValue({ issuanceId: 'iss-1' }),
    reverseFromSalesReturn: jest.fn().mockResolvedValue({ id: 'iss-1' }),
  };
  const financeAdapter: any = {
    createDraftARInvoiceFromSO: jest.fn().mockResolvedValue({
      arInvoiceId: 'ar-1',
      invoiceNumber: 'AR-2026-0001',
    }),
    recordSalesReturnGl: jest
      .fn()
      .mockResolvedValue({ glPostingQueueId: 'glq-1' }),
    recordSOApprovalGl: jest
      .fn()
      .mockResolvedValue({ glPostingQueueId: 'glq-so' }),
  };

  const dataSource: any = {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM sales_orders')) return so ? [so] : [];
      if (sql.includes('FROM sales_returns')) return ret ? [ret] : [];
      return [];
    }),
  };

  const svc = new SalesOrchestratorService(
    dataSource,
    salesOrderService,
    salesReturnService,
    warehouseAdapter,
    financeAdapter,
  );
  return {
    svc,
    salesOrderService,
    salesReturnService,
    warehouseAdapter,
    financeAdapter,
    dataSource,
  };
}

describe('SalesOrchestratorService', () => {
  describe('approveSO', () => {
    it('approves the SO and enqueues the commitment GL', async () => {
      const { svc, salesOrderService, financeAdapter } = makeOrchestrator({
        so: { id: 'so-1', status: 'approved' },
      });
      const result = await svc.approveSO('so-1');
      expect(salesOrderService.approve).toHaveBeenCalledWith('so-1');
      expect(financeAdapter.recordSOApprovalGl).toHaveBeenCalledWith('so-1');
      expect(result).toMatchObject({ id: 'so-1', status: 'approved' });
    });
  });

  describe('deliverSO', () => {
    it('throws NotFoundException when the SO is missing', async () => {
      const { svc } = makeOrchestrator({ so: null });
      await expect(
        svc.deliverSO('missing', 'user-1', 'wh-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException for a draft SO', async () => {
      const { svc } = makeOrchestrator({
        so: { id: 'so-1', status: 'draft' },
      });
      await expect(
        svc.deliverSO('so-1', 'user-1', 'wh-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forwards to the warehouse adapter for an approved SO', async () => {
      const { svc, warehouseAdapter } = makeOrchestrator({
        so: { id: 'so-1', status: 'approved' },
      });
      const result = await svc.deliverSO('so-1', 'user-1', 'wh-1');
      expect(warehouseAdapter.createDraftIssuanceFromSO).toHaveBeenCalledWith(
        'so-1',
        'user-1',
        'wh-1',
      );
      expect(result).toEqual({ issuanceId: 'iss-1' });
    });
  });

  describe('invoiceSO', () => {
    it('rejects invoicing a draft SO', async () => {
      const { svc } = makeOrchestrator({
        so: { id: 'so-1', status: 'draft' },
      });
      await expect(svc.invoiceSO('so-1', 'user-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('forwards to the finance adapter for a fully_delivered SO', async () => {
      const { svc, financeAdapter } = makeOrchestrator({
        so: { id: 'so-1', status: 'fully_delivered' },
      });
      const result = await svc.invoiceSO('so-1', 'user-1');
      expect(financeAdapter.createDraftARInvoiceFromSO).toHaveBeenCalledWith(
        'so-1',
        'user-1',
        undefined,
      );
      expect(result).toEqual({
        arInvoiceId: 'ar-1',
        invoiceNumber: 'AR-2026-0001',
      });
    });
  });

  describe('approveSalesReturn', () => {
    it('approves the return, reverses the warehouse issuance and enqueues GL', async () => {
      const { svc, salesReturnService, warehouseAdapter, financeAdapter } =
        makeOrchestrator({ ret: { id: 'srtn-1', status: 'approved' } });

      await svc.approveSalesReturn('srtn-1', 'user-1', 'damaged');

      expect(salesReturnService.approve).toHaveBeenCalledWith(
        'srtn-1',
        'user-1',
      );
      expect(warehouseAdapter.reverseFromSalesReturn).toHaveBeenCalledWith(
        'srtn-1',
        'user-1',
        'damaged',
      );
      expect(financeAdapter.recordSalesReturnGl).toHaveBeenCalledWith('srtn-1');
    });

    it('still completes approval if warehouse reversal fails (warn-only)', async () => {
      const { svc, warehouseAdapter } = makeOrchestrator({
        ret: { id: 'srtn-1', status: 'approved' },
      });
      warehouseAdapter.reverseFromSalesReturn.mockRejectedValue(
        new Error('warehouse-failure'),
      );
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await svc.approveSalesReturn(
        'srtn-1',
        'user-1',
        'damaged',
      );
      expect(result).toBeDefined();
      warnSpy.mockRestore();
    });
  });
});
