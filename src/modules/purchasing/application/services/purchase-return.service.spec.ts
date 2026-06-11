import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseReturnService } from './purchase-return.service';
import { PurchaseReturnLineTypeOrmEntity } from '../../infrastructure/entities/purchase-return-line-typeorm.entity';

/**
 * Unit tests for the purchase-return service. The new `approve()` method
 * is the only behavior the PR module needed from the broader
 * orchestration work (a return is approved → GL entry enqueued) and it is
 * the riskiest surface for state-machine regressions, so it deserves
 * direct coverage.
 *
 * The service is wired with a real `DataSource` shim and a fake
 * `GlPostingQueueService` because approve() is the only entry that
 * touches both.
 */

function makeService(opts: {
  ret?: {
    id: string;
    status: string;
    totalAmount: number;
    supplierId: string;
    supplierName: string;
    returnNumber: string;
  } | null;
  glEntry?: { id: string } | null;
}) {
  const ret = opts.ret ?? null;
  const glCalls: any[] = [];
  const lineRepo: any = { find: jest.fn().mockResolvedValue([]) };
  const repo: any = {
    findOne: jest.fn().mockImplementation(async ({ where }: any) => {
      if (!ret) return null;
      if (where?.id && where?.id !== ret.id) return null;
      return ret;
    }),
    save: jest.fn().mockImplementation(async (entity: any) => ({
      ...ret,
      ...entity,
    })),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource: any = {
    getRepository: jest.fn().mockImplementation((entity: any) => {
      // The service queries a différent repo for line items.
      if (
        entity === PurchaseReturnLineTypeOrmEntity ||
        entity?.name === 'PurchaseReturnLineTypeOrmEntity'
      )
        return lineRepo;
      return repo;
    }),
  };
  const glPostingQueueService: any = {
    createEntry: jest.fn().mockImplementation(async (dto: any) => {
      glCalls.push(dto);
      return opts.glEntry ?? { id: 'glq-1' };
    }),
  };
  const docHelper: any = {
    generateAsync: jest.fn().mockResolvedValue({ id: 'doc-1' }),
  };
  const svc = new PurchaseReturnService(
    dataSource,
    glPostingQueueService,
    docHelper,
  );
  return {
    svc,
    repo,
    dataSource,
    glPostingQueueService,
    glCalls,
  };
}

describe('PurchaseReturnService.approve', () => {
  it('throws NotFoundException when the return id is unknown', async () => {
    const { svc } = makeService({ ret: null });
    await expect(svc.approve('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException when the return is not in draft', async () => {
    const { svc } = makeService({
      ret: {
        id: 'prtn-1',
        status: 'approved',
        totalAmount: 100,
        supplierId: 's1',
        supplierName: 'Acme',
        returnNumber: 'PRTN-2026-0001',
      },
    });
    await expect(svc.approve('prtn-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('moves status to approved and stamps approver + approvedAt', async () => {
    const { svc, repo } = makeService({
      ret: {
        id: 'prtn-1',
        status: 'draft',
        totalAmount: 250,
        supplierId: 's1',
        supplierName: 'Acme',
        returnNumber: 'PRTN-2026-0001',
      },
    });

    const result = await svc.approve('prtn-1', 'user-42');

    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0][0];
    expect(saved.status).toBe('approved');
    expect(saved.approvedBy).toBe('user-42');
    expect(saved.approvedAt).toBeInstanceOf(Date);
    expect(result).toBeDefined();
  });

  it('enqueues a GL posting reversing AP/Inventory on approval', async () => {
    const { svc, glCalls } = makeService({
      ret: {
        id: 'prtn-1',
        status: 'draft',
        totalAmount: 750,
        supplierId: 's1',
        supplierName: 'Acme',
        returnNumber: 'PRTN-2026-0001',
      },
    });

    await svc.approve('prtn-1', 'user-42');

    expect(glCalls).toHaveLength(1);
    expect(glCalls[0]).toMatchObject({
      sourceType: 'purchase_return',
      eventType: 'purchase_return_approved',
      amount: 750,
    });
    expect(glCalls[0].suggestedLines).toEqual([
      expect.objectContaining({ accountCode: '2100', debit: 750, credit: 0 }),
      expect.objectContaining({ accountCode: '1300', debit: 0, credit: 750 }),
    ]);
  });

  it('skips GL enqueue when the return has zero amount', async () => {
    const { svc, glCalls } = makeService({
      ret: {
        id: 'prtn-1',
        status: 'draft',
        totalAmount: 0,
        supplierId: 's1',
        supplierName: 'Acme',
        returnNumber: 'PRTN-2026-0001',
      },
    });

    await svc.approve('prtn-1', 'user-42');

    expect(glCalls).toHaveLength(0);
  });

  it('persists the glPostingQueueId back on the return row', async () => {
    const { svc, repo } = makeService({
      ret: {
        id: 'prtn-1',
        status: 'draft',
        totalAmount: 500,
        supplierId: 's1',
        supplierName: 'Acme',
        returnNumber: 'PRTN-2026-0001',
      },
      glEntry: { id: 'glq-77' },
    });

    await svc.approve('prtn-1', 'user-42');

    const updates = repo.update.mock.calls;
    const lastUpdate = updates[updates.length - 1];
    expect(lastUpdate[0]).toBe('prtn-1');
    expect(lastUpdate[1]).toMatchObject({ glPostingQueueId: 'glq-77' });
  });
});
