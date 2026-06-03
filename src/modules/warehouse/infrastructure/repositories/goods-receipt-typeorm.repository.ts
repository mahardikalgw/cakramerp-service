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
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    let whereClause = '';
    const params: any[] = [];
    if (filters?.warehouseId) {
      whereClause = 'WHERE gr.warehouse_id = $1';
      params.push(filters.warehouseId);
    }

    const offset = (page - 1) * limit;
    const countParams = [...params];
    params.push(limit, offset);

    const rows = await this.dataSource.query(
      `SELECT gr.*, w.name AS warehouse_name
       FROM goods_receipts gr
       LEFT JOIN warehouses w ON w.id = gr.warehouse_id
       ${whereClause}
       ORDER BY gr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM goods_receipts gr ${whereClause}`,
      countParams,
    );
    const total = countResult[0]?.cnt ?? 0;

    const data = rows.map((row: any) => ({
      id: row.id,
      grnNumber: row.grn_number,
      poId: row.po_id,
      warehouseId: row.warehouse_id,
      supplierId: row.supplier_id,
      vendorName: row.vendor_name,
      receivedDate: row.received_date,
      notes: row.notes,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      warehouse: row.warehouse_name ?? null,
    }));

    return { data, total };
  }

  async findById(
    id: string,
  ): Promise<{ receipt: GoodsReceipt; lines: GoodsReceiptLine[] } | null> {
    const receipt = await this.receiptRepo.findOne({ where: { id } });
    if (!receipt) return null;

    const warehouse = await this.dataSource.query(
      `SELECT name FROM warehouses WHERE id = $1 LIMIT 1`,
      [receipt.warehouseId],
    );

    const lines = await this.lineRepo.find({
      where: { goodsReceiptId: id },
      order: { createdAt: 'ASC' },
    });

    const mappedReceipt = this.mapToGoodsReceipt(receipt);
    (mappedReceipt as any).warehouse = warehouse[0]?.name ?? null;

    return {
      receipt: mappedReceipt,
      lines: lines.map((l) => this.mapToGoodsReceiptLine(l)),
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
