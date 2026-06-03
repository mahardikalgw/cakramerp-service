import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesReturnService } from './sales-return.service';

/**
 * Unit tests for the sales-return service. The new `approve()` method is
 * the mirror of the purchasing-side one and needs the same coverage.
 *
 * Unlike the purchasing side, the sales return service does not own a
 * `glPostingQueueService`; instead it persists a single GL entry on
 * `create()` (already covered by the existing implementation) and
 * `approve()` only flips the status.
 */

function makeService(opts: { ret?: { id: string; status: string } | null }) {
  const ret = opts.ret ?? null;
  const repo: any = {
    findOne: jest.fn().mockImplementation(async ({ where }: any) => {
      if (!ret) return null;
      if (where?.id && where.id !== ret.id) return null;
      return ret;
    }),
    save: jest.fn().mockImplementation(async (e: any) => ({ ...ret, ...e })),
  };
  const lineRepo: any = { find: jest.fn().mockResolvedValue([]) };
  const queueRepo: any = {
    save: jest.fn().mockImplementation(async (e: any) => e),
  };
  const dataSource: any = {
    getRepository: jest.fn().mockImplementation((entity: any) => {
      // Crude routing: purchase-order-line returns the line repo,
      // GL posting queue returns the queue repo, otherwise the return repo.
      if (
        entity?.name === 'SalesReturnTypeOrmEntity' ||
        entity === 'sales_returns'
      )
        return repo;
      if (
        entity?.name === 'SalesReturnLineTypeOrmEntity' ||
        entity === 'sales_return_lines'
      )
        return lineRepo;
      if (
        entity?.name === 'GlPostingQueueTypeOrmEntity' ||
        entity === 'gl_posting_queue'
      )
        return queueRepo;
      return repo;
    }),
  };
  const svc = new SalesReturnService(dataSource);
  return { svc, repo, dataSource };
}

describe('SalesReturnService.approve', () => {
  it('throws NotFoundException when the return id is unknown', async () => {
    const { svc } = makeService({ ret: null });
    await expect(svc.approve('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException when the return is not in draft', async () => {
    const { svc } = makeService({
      ret: { id: 'srtn-1', status: 'approved' },
    });
    await expect(svc.approve('srtn-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('moves status to approved', async () => {
    const { svc, repo } = makeService({
      ret: { id: 'srtn-1', status: 'draft' },
    });
    await svc.approve('srtn-1', 'user-42');
    const saved = repo.save.mock.calls[0][0];
    expect(saved.status).toBe('approved');
  });
});
