import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { GoodsReceiptLine } from '../entities/goods-receipt-line.entity';

export const GOODS_RECEIPT_REPOSITORY = Symbol('GOODS_RECEIPT_REPOSITORY');

export interface GoodsReceiptRepositoryPort {
  create(receipt: Partial<GoodsReceipt>): Promise<GoodsReceipt>;
  createLine(line: Partial<GoodsReceiptLine>): Promise<GoodsReceiptLine>;
  findAll(filters?: {
    warehouseId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GoodsReceipt[]; total: number }>;
  findById(
    id: string,
  ): Promise<{ receipt: GoodsReceipt; lines: GoodsReceiptLine[] } | null>;
  getLastGrnNumber(prefix: string): Promise<string | null>;
  generateNextGrnNumber(): Promise<string>;
}
