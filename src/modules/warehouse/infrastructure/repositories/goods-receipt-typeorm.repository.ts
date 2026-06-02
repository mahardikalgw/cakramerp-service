import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GoodsReceiptRepositoryPort } from '../../domain/repositories/goods-receipt-repository.port';
import { GoodsReceipt } from '../../domain/entities/goods-receipt.entity';
import { GoodsReceiptLine } from '../../domain/entities/goods-receipt-line.entity';
import { GoodsReceiptTypeOrmEntity } from '../entities/goods-receipt-typeorm.entity';
import { GoodsReceiptLineTypeOrmEntity } from '../entities/goods-receipt-line-typeorm.entity';

@Injectable()
export class GoodsReceiptTypeOrmRepository implements GoodsReceiptRepositoryPort {
  private readonly receiptRepo: Repository<GoodsReceiptTypeOrmEntity>;
  private readonly lineRepo: Repository<GoodsReceiptLineTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.receiptRepo = dataSource.getRepository(GoodsReceiptTypeOrmEntity);
    this.lineRepo = dataSource.getRepository(GoodsReceiptLineTypeOrmEntity);
  }

  async create(receipt: Partial<GoodsReceipt>): Promise<GoodsReceipt> {
    const entity = this.receiptRepo.create({
      grnNumber: receipt.grnNumber,
      poId: receipt.poId,
      warehouseId: receipt.warehouseId,
      supplierId: receipt.supplierId,
      vendorName: receipt.vendorName,
      receivedDate: receipt.receivedDate,
      notes: receipt.notes,
      status: receipt.status,
      createdBy: receipt.createdBy,
    });

    const saved = await this.receiptRepo.save(entity);
    return this.mapToGoodsReceipt(saved);
  }

  async createLine(line: Partial<GoodsReceiptLine>): Promise<GoodsReceiptLine> {
    const entity = this.lineRepo.create({
      goodsReceiptId: line.goodsReceiptId,
      itemId: line.itemId,
      itemName: line.itemName,
      poQty: line.poQty,
      receivedQty: line.receivedQty,
      discrepancyQty: line.discrepancyQty,
      uom: line.uom,
      remarks: line.remarks,
    });

    const saved = await this.lineRepo.save(entity);
    return this.mapToGoodsReceiptLine(saved);
  }

  async findAll(filters?: {
    warehouseId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GoodsReceipt[]; total: number }> {
    const qb = this.receiptRepo.createQueryBuilder('gr');

    if (filters?.warehouseId) {
      qb.andWhere('gr.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('gr.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data: data.map(this.mapToGoodsReceipt), total };
  }

  async findById(
    id: string,
  ): Promise<{ receipt: GoodsReceipt; lines: GoodsReceiptLine[] } | null> {
    const receipt = await this.receiptRepo.findOne({ where: { id } });
    if (!receipt) return null;

    const lines = await this.lineRepo.find({
      where: { goodsReceiptId: id },
      order: { createdAt: 'ASC' },
    });

    return {
      receipt: this.mapToGoodsReceipt(receipt),
      lines: lines.map(this.mapToGoodsReceiptLine),
    };
  }

  async getLastGrnNumber(prefix: string): Promise<string | null> {
    const last = await this.receiptRepo
      .createQueryBuilder('gr')
      .where('gr.grnNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('gr.grnNumber', 'DESC')
      .getOne();

    return last?.grnNumber ?? null;
  }

  private mapToGoodsReceipt(entity: GoodsReceiptTypeOrmEntity): GoodsReceipt {
    return new GoodsReceipt({
      id: entity.id,
      grnNumber: entity.grnNumber,
      poId: entity.poId,
      warehouseId: entity.warehouseId,
      supplierId: entity.supplierId,
      vendorName: entity.vendorName,
      receivedDate: entity.receivedDate,
      notes: entity.notes,
      status: entity.status,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
    });
  }

  private mapToGoodsReceiptLine(
    entity: GoodsReceiptLineTypeOrmEntity,
  ): GoodsReceiptLine {
    return new GoodsReceiptLine({
      id: entity.id,
      goodsReceiptId: entity.goodsReceiptId,
      itemId: entity.itemId,
      itemName: entity.itemName,
      poQty: Number(entity.poQty),
      receivedQty: Number(entity.receivedQty),
      discrepancyQty: Number(entity.discrepancyQty),
      uom: entity.uom,
      remarks: entity.remarks,
    });
  }
}
