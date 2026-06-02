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
    const qb = this.issuanceRepo.createQueryBuilder('si');

    if (filters?.warehouseId) {
      qb.andWhere('si.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }
    if (filters?.destinationType) {
      qb.andWhere('si.destinationType = :destinationType', {
        destinationType: filters.destinationType,
      });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('si.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data: data.map(this.mapToStockIssuance), total };
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
      lines: lines.map(this.mapToStockIssuanceLine),
    };
  }

  async findLinesById(issuanceId: string): Promise<StockIssuanceLine[]> {
    const lines = await this.lineRepo.find({
      where: { issuanceId },
      order: { createdAt: 'ASC' },
    });

    return lines.map(this.mapToStockIssuanceLine);
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
