import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockIssuanceRepositoryPort } from '../../domain/repositories/stock-issuance-repository.port';
import { StockIssuance } from '../../domain/entities/stock-issuance.entity';
import { StockIssuanceLine } from '../../domain/entities/stock-issuance-line.entity';
import { StockIssuanceTypeOrmEntity } from '../entities/stock-issuance-typeorm.entity';
import { StockIssuanceLineTypeOrmEntity } from '../entities/stock-issuance-line-typeorm.entity';

@Injectable()
export class StockIssuanceTypeOrmRepository implements StockIssuanceRepositoryPort {
  private readonly issuanceRepo: Repository<StockIssuanceTypeOrmEntity>;
  private readonly lineRepo: Repository<StockIssuanceLineTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.issuanceRepo = dataSource.getRepository(StockIssuanceTypeOrmEntity);
    this.lineRepo = dataSource.getRepository(StockIssuanceLineTypeOrmEntity);
  }

  async create(issuance: Partial<StockIssuance>): Promise<StockIssuance> {
    const entity = this.issuanceRepo.create({
      issuanceNumber: issuance.issuanceNumber,
      warehouseId: issuance.warehouseId,
      destinationType: issuance.destinationType,
      destinationId: issuance.destinationId,
      destinationName: issuance.destinationName,
      issuanceDate: issuance.issuanceDate,
      status: issuance.status,
      createdBy: issuance.createdBy,
    });

    const saved = await this.issuanceRepo.save(entity);
    return this.mapToStockIssuance(saved);
  }

  async createLine(
    line: Partial<StockIssuanceLine>,
  ): Promise<StockIssuanceLine> {
    const entity = this.lineRepo.create({
      issuanceId: line.issuanceId,
      itemId: line.itemId,
      itemName: line.itemName,
      quantity: line.quantity,
      uom: line.uom,
    });

    const saved = await this.lineRepo.save(entity);
    return this.mapToStockIssuanceLine(saved);
  }

  async findAll(filters?: {
    warehouseId?: string;
    destinationType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: StockIssuance[]; total: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.warehouseId) {
      params.push(filters.warehouseId);
      conditions.push(`si.warehouse_id = $${params.length}`);
    }
    if (filters?.destinationType) {
      params.push(filters.destinationType);
      conditions.push(`si.destination_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    const countParams = [...params];
    params.push(limit, offset);

    const rows = await this.dataSource.query(
      `SELECT si.*, w.name AS warehouse_name
       FROM stock_issuances si
       LEFT JOIN warehouses w ON w.id = si.warehouse_id
       ${whereClause}
       ORDER BY si.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM stock_issuances si ${whereClause}`,
      countParams,
    );
    const total = countResult[0]?.cnt ?? 0;

    const data = rows.map((row: any) => ({
      id: row.id,
      issuanceNumber: row.issuance_number,
      warehouseId: row.warehouse_id,
      destinationType: row.destination_type,
      destinationId: row.destination_id,
      destinationName: row.destination_name,
      issuanceDate: row.issuance_date,
      status: row.status,
      createdBy: row.created_by,
      reversalReason: row.reversal_reason,
      reversedAt: row.reversed_at,
      createdAt: row.created_at,
      warehouse: row.warehouse_name ?? null,
    }));

    return { data, total };
  }

  async findById(
    id: string,
  ): Promise<{ issuance: StockIssuance; lines: StockIssuanceLine[] } | null> {
    const issuance = await this.issuanceRepo.findOne({ where: { id } });
    if (!issuance) return null;

    const lines = await this.lineRepo.find({
      where: { issuanceId: id },
      order: { createdAt: 'ASC' },
    });

    return {
      issuance: this.mapToStockIssuance(issuance),
      lines: lines.map((l) => this.mapToStockIssuanceLine(l)),
    };
  }

  async findLinesById(issuanceId: string): Promise<StockIssuanceLine[]> {
    const lines = await this.lineRepo.find({
      where: { issuanceId },
      order: { createdAt: 'ASC' },
    });

    return lines.map((l) => this.mapToStockIssuanceLine(l));
  }

  async update(
    id: string,
    data: Partial<StockIssuance>,
  ): Promise<StockIssuance> {
    const issuance = await this.issuanceRepo.findOne({ where: { id } });
    if (!issuance) throw new Error('Stock issuance not found');

    Object.assign(issuance, {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.reversalReason !== undefined && {
        reversalReason: data.reversalReason,
      }),
      ...(data.reversedAt !== undefined && { reversedAt: data.reversedAt }),
    });

    const saved = await this.issuanceRepo.save(issuance);
    return this.mapToStockIssuance(saved);
  }

  async getLastIssuanceNumber(prefix: string): Promise<string | null> {
    const last = await this.issuanceRepo
      .createQueryBuilder('si')
      .where('si.issuanceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('si.issuanceNumber', 'DESC')
      .getOne();

    return last?.issuanceNumber ?? null;
  }

  private mapToStockIssuance(
    entity: StockIssuanceTypeOrmEntity,
  ): StockIssuance {
    return new StockIssuance({
      id: entity.id,
      issuanceNumber: entity.issuanceNumber,
      warehouseId: entity.warehouseId,
      destinationType: entity.destinationType,
      destinationId: entity.destinationId,
      destinationName: entity.destinationName,
      issuanceDate: entity.issuanceDate,
      status: entity.status,
      createdBy: entity.createdBy,
      reversalReason: entity.reversalReason,
      reversedAt: entity.reversedAt,
      createdAt: entity.createdAt,
    });
  }

  private mapToStockIssuanceLine(
    entity: StockIssuanceLineTypeOrmEntity,
  ): StockIssuanceLine {
    return new StockIssuanceLine({
      id: entity.id,
      issuanceId: entity.issuanceId,
      itemId: entity.itemId,
      itemName: entity.itemName,
      quantity: Number(entity.quantity),
      uom: entity.uom,
    });
  }
}
