import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrchestratorService } from './purchase-orchestrator.service';

/**
 * Unit tests for the purchase orchestrator. The orchestrator is where
 * "approve → GL enqueue", "receive → GRN", "invoice → AP invoice" and
 * "approve return → GL enqueue" all converge, so it deserves focused
 * coverage on the state-machine transitions rather than on the
 * underlying adapters (which have their own tests).
 */

function makeOrchestrator(opts: {
  po?: any;
  ret?: any;
  purchaseOrderService?: any;
  purchaseReturnService?: any;
  warehouseAdapter?: any;
  financeAdapter?: any;
}) {
  const po = opts.po ?? null;
  const ret = opts.ret ?? null;

  const purchaseOrderService: any = {
    approve: jest.fn().mockResolvedValue({ id: 'po-1', status: 'approved' }),
    reject: jest.fn().mockResolvedValue({ id: 'po-1', status: 'rejected' }),
  };
  const purchaseReturnService: any = {
    approve: jest.fn().mockResolvedValue({ id: 'prtn-1', status: 'approved' }),
  };
  const warehouseAdapter: any = {
    createDraftGoodsReceiptFromPO: jest.fn().mockResolvedValue({
      goodsReceiptId: 'grn-1',
      goodsReceiptNumber: 'GRN-2026-0001',
    }),
  };
  const financeAdapter: any = {
    createDraftAPInvoiceFromPO: jest.fn().mockResolvedValue({
      apInvoiceId: 'ap-1',
      invoiceNumber: 'AP-2026-0001',
    }),
    recordPurchaseReturnGl: jest.fn().mockResolvedValue({
      glPostingQueueId: 'glq-1',
    }),
    recordPOApprovalGl: jest.fn().mockResolvedValue({
      glPostingQueueId: 'glq-po',
    }),
  };

  const dataSource: any = {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes('FROM purchase_orders')) return po ? [po] : [];
      if (sql.includes('FROM purchase_returns')) return ret ? [ret] : [];
      return [];
    }),
  };

  const svc = new PurchaseOrchestratorService(
    dataSource,
    purchaseOrderService,
    purchaseReturnService,
    warehouseAdapter,
    financeAdapter,
  );
  return {
    svc,
    purchaseOrderService,
    purchaseReturnService,
    warehouseAdapter,
    financeAdapter,
    dataSource,
  };
}

describe('PurchaseOrchestratorService', () => {
  describe('approvePO', () => {
    it('approves the PO and enqueues the commitment GL', async () => {
      const { svc, purchaseOrderService, financeAdapter } = makeOrchestrator({
        po: { id: 'po-1', status: 'approved' },
      });
      const result = await svc.approvePO('po-1', 'user-1');
      expect(purchaseOrderService.approve).toHaveBeenCalledWith(
        'po-1',
        'user-1',
      );
      expect(financeAdapter.recordPOApprovalGl).toHaveBeenCalledWith('po-1');
      expect(result).toMatchObject({ id: 'po-1', status: 'approved' });
    });

    it('still returns the approved PO even if GL enqueue fails (warn-only path)', async () => {
      const { svc, financeAdapter } = makeOrchestrator({
        po: { id: 'po-1', status: 'approved' },
      });
      financeAdapter.recordPOApprovalGl.mockRejectedValue(
        new Error('gl-failed'),
      );
      // Spy on console.warn to silence it; we don't assert on it.
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await svc.approvePO('po-1', 'user-1');
      expect(result).toMatchObject({ id: 'po-1', status: 'approved' });
      warnSpy.mockRestore();
    });
  });

  describe('receivePO', () => {
    it('throws NotFoundException when the PO is missing', async () => {
      const { svc } = makeOrchestrator({ po: null });
      await expect(
        svc.receivePO('missing', 'user-1', 'wh-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when the PO is still a draft', async () => {
      const { svc } = makeOrchestrator({
        po: { id: 'po-1', status: 'draft' },
      });
      await expect(
        svc.receivePO('po-1', 'user-1', 'wh-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forwards to the warehouse adapter when status is approved', async () => {
      const { svc, warehouseAdapter } = makeOrchestrator({
        po: { id: 'po-1', status: 'approved' },
      });
      const result = await svc.receivePO('po-1', 'user-1', 'wh-1');
      expect(
        warehouseAdapter.createDraftGoodsReceiptFromPO,
      ).toHaveBeenCalledWith('po-1', 'user-1', 'wh-1');
      expect(result).toEqual({
        goodsReceiptId: 'grn-1',
        goodsReceiptNumber: 'GRN-2026-0001',
      });
    });

    it('accepts a fully_received PO (allows receipt against late-arriving stock)', async () => {
      const { svc, warehouseAdapter } = makeOrchestrator({
        po: { id: 'po-1', status: 'fully_received' },
      });
      await svc.receivePO('po-1', 'user-1', 'wh-1');
      expect(warehouseAdapter.createDraftGoodsReceiptFromPO).toHaveBeenCalled();
    });
  });

  describe('invoicePO', () => {
    it('rejects invoicing a draft PO', async () => {
      const { svc } = makeOrchestrator({
        po: { id: 'po-1', status: 'draft' },
      });
      await expect(svc.invoicePO('po-1', 'user-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('forwards to the finance adapter when status is partially_received', async () => {
      const { svc, financeAdapter } = makeOrchestrator({
        po: { id: 'po-1', status: 'partially_received' },
      });
      const result = await svc.invoicePO('po-1', 'user-1');
      expect(financeAdapter.createDraftAPInvoiceFromPO).toHaveBeenCalledWith(
        'po-1',
        'user-1',
        undefined,
      );
      expect(result).toEqual({
        apInvoiceId: 'ap-1',
        invoiceNumber: 'AP-2026-0001',
      });
    });
  });

  describe('approvePurchaseReturn', () => {
    it('approves the return and enqueues the reversal GL', async () => {
      const { svc, purchaseReturnService, financeAdapter } = makeOrchestrator({
        ret: { id: 'prtn-1', status: 'approved' },
      });
      const result = await svc.approvePurchaseReturn('prtn-1', 'user-1');
      expect(purchaseReturnService.approve).toHaveBeenCalledWith(
        'prtn-1',
        'user-1',
      );
      expect(financeAdapter.recordPurchaseReturnGl).toHaveBeenCalledWith(
        'prtn-1',
      );
      expect(result).toBeDefined();
    });
  });
});
