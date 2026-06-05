import { Inject, Injectable } from '@nestjs/common';
import { GL_POSTING_QUEUE_PORT } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import type { GlPostingQueuePort } from '../../../../shared/kernel/domain/ports/gl-posting-queue.port';
import { SOURCE_TYPES } from '../../../../modules/shared/commercial-document.constants';

/**
 * Asset → Finance adapter.
 *
 * Owns the conversion of asset depreciation into GL posting queue entries.
 * This adapter is the only place Asset module talks to finance.
 */
@Injectable()
export class AssetFinanceAdapter {
  constructor(
    @Inject(GL_POSTING_QUEUE_PORT)
    private readonly glPostingQueue: GlPostingQueuePort,
  ) {}

  async recordDepreciationGl(
    assetId: string,
    assetNumber: string,
    assetName: string,
    depreciationAmount: number,
    periodLabel: string,
  ): Promise<{ glPostingQueueId: string }> {
    const entry = await this.glPostingQueue.createEntry({
      sourceType: SOURCE_TYPES.ASSET_DEPRECIATION,
      sourceId: assetId,
      sourceNumber: assetNumber,
      eventType: 'depreciation',
      amount: depreciationAmount,
      description: `Depreciation for ${assetName} — ${periodLabel}`,
      suggestedLines: [
        {
          accountId: '',
          accountCode: '6xxx',
          accountName: 'Depreciation Expense',
          debit: depreciationAmount,
          credit: 0,
          description: `Depreciation - ${assetName}`,
        },
        {
          accountId: '',
          accountCode: '1xxx',
          accountName: 'Accumulated Depreciation',
          debit: 0,
          credit: depreciationAmount,
          description: `Accumulated Depreciation - ${assetName}`,
        },
      ],
    });

    return { glPostingQueueId: entry.id };
  }
}
