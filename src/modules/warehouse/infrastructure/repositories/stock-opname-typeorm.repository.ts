import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockOpnameRepositoryPort } from '../../domain/repositories/stock-opname-repository.port';
import { StockOpnameSession } from '../../domain/entities/stock-opname-session.entity';
import { StockOpnameLine } from '../../domain/entities/stock-opname-line.entity';
import { StockOpnameSessionTypeOrmEntity } from '../entities/stock-opname-session-typeorm.entity';
import { StockOpnameLineTypeOrmEntity } from '../entities/stock-opname-line-typeorm.entity';
import { ItemStockBalanceTypeOrmEntity } from '../entities/item-stock-balance-typeorm.entity';
import { ItemTypeOrmEntity } from '../entities/item-typeorm.entity';

@Injectable()
export class StockOpnameTypeOrmRepository implements StockOpnameRepositoryPort {
  private readonly sessionRepo: Repository<StockOpnameSessionTypeOrmEntity>;
  private readonly lineRepo: Repository<StockOpnameLineTypeOrmEntity>;
  private readonly balanceRepo: Repository<ItemStockBalanceTypeOrmEntity>;
  private readonly itemRepo: Repository<ItemTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.sessionRepo = dataSource.getRepository(
      StockOpnameSessionTypeOrmEntity,
    );
    this.lineRepo = dataSource.getRepository(StockOpnameLineTypeOrmEntity);
    this.balanceRepo = dataSource.getRepository(ItemStockBalanceTypeOrmEntity);
    this.itemRepo = dataSource.getRepository(ItemTypeOrmEntity);
  }

  async createSession(
    session: Partial<StockOpnameSession>,
  ): Promise<StockOpnameSession> {
    const entity = this.sessionRepo.create({
      warehouseId: session.warehouseId,
      warehouseName: session.warehouseName,
      conductedBy: session.conductedBy,
      status: session.status,
    });

    const saved = await this.sessionRepo.save(entity);
    return this.mapToStockOpnameSession(saved);
  }

  async createLine(line: Partial<StockOpnameLine>): Promise<StockOpnameLine> {
    const entity = this.lineRepo.create({
      sessionId: line.sessionId,
      itemId: line.itemId,
      itemName: line.itemName,
      systemQty: line.systemQty,
      actualQty: line.actualQty,
      varianceQty: line.varianceQty,
      uom: line.uom,
    });

    const saved = await this.lineRepo.save(entity);
    return this.mapToStockOpnameLine(saved);
  }

  async findAll(filters?: {
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: StockOpnameSession[]; total: number }> {
    const qb = this.sessionRepo.createQueryBuilder('so');

    if (filters?.warehouseId) {
      qb.andWhere('so.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }
    if (filters?.status) {
      qb.andWhere('so.status = :status', { status: filters.status });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('so.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data: data.map((s) => this.mapToStockOpnameSession(s)), total };
  }

  async findById(
    id: string,
  ): Promise<{ session: StockOpnameSession; lines: StockOpnameLine[] } | null> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) return null;

    const lines = await this.lineRepo.find({
      where: { sessionId: id },
      order: { itemName: 'ASC' },
    });

    return {
      session: this.mapToStockOpnameSession(session),
      lines: lines.map((l) => this.mapToStockOpnameLine(l)),
    };
  }

  async findSessionById(id: string): Promise<StockOpnameSession | null> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) return null;

    return this.mapToStockOpnameSession(session);
  }

  async findLinesBySessionId(sessionId: string): Promise<StockOpnameLine[]> {
    const lines = await this.lineRepo.find({
      where: { sessionId },
      order: { itemName: 'ASC' },
    });

    return lines.map((l) => this.mapToStockOpnameLine(l));
  }

  async findLineBySessionAndItem(
    sessionId: string,
    itemId: string,
  ): Promise<StockOpnameLine | null> {
    const line = await this.lineRepo.findOne({
      where: { sessionId, itemId },
    });

    if (!line) return null;
    return this.mapToStockOpnameLine(line);
  }

  async updateSession(
    id: string,
    data: Partial<StockOpnameSession>,
  ): Promise<StockOpnameSession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new Error('Stock opname session not found');

    Object.assign(session, {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.submittedAt !== undefined && { submittedAt: data.submittedAt }),
      ...(data.approvedBy !== undefined && { approvedBy: data.approvedBy }),
      ...(data.approvedAt !== undefined && { approvedAt: data.approvedAt }),
    });

    const saved = await this.sessionRepo.save(session);
    return this.mapToStockOpnameSession(saved);
  }

  async updateLine(
    id: string,
    data: Partial<StockOpnameLine>,
  ): Promise<StockOpnameLine> {
    const line = await this.lineRepo.findOne({ where: { id } });
    if (!line) throw new Error('Stock opname line not found');

    Object.assign(line, {
      ...(data.actualQty !== undefined && { actualQty: data.actualQty }),
      ...(data.varianceQty !== undefined && { varianceQty: data.varianceQty }),
    });

    const saved = await this.lineRepo.save(line);
    return this.mapToStockOpnameLine(saved);
  }

  async getBalancesForWarehouse(
    warehouseId: string,
  ): Promise<
    { itemId: string; itemName: string; quantity: number; uom: string }[]
  > {
    const balances = await this.balanceRepo.find({ where: { warehouseId } });

    const results: {
      itemId: string;
      itemName: string;
      quantity: number;
      uom: string;
    }[] = [];

    for (const balance of balances) {
      const item = await this.itemRepo.findOne({
        where: { id: balance.itemId },
      });

      results.push({
        itemId: balance.itemId,
        itemName: item?.name ?? 'Unknown Item',
        quantity: Number(balance.quantity),
        uom: item?.uom ?? 'pcs',
      });
    }

    return results;
  }

  private mapToStockOpnameSession(
    entity: StockOpnameSessionTypeOrmEntity,
  ): StockOpnameSession {
    return new StockOpnameSession({
      id: entity.id,
      warehouseId: entity.warehouseId,
      warehouseName: entity.warehouseName,
      conductedBy: entity.conductedBy,
      status: entity.status,
      submittedAt: entity.submittedAt,
      approvedBy: entity.approvedBy,
      approvedAt: entity.approvedAt,
      createdAt: entity.createdAt,
    });
  }

  private mapToStockOpnameLine(
    entity: StockOpnameLineTypeOrmEntity,
  ): StockOpnameLine {
    return new StockOpnameLine({
      id: entity.id,
      sessionId: entity.sessionId,
      itemId: entity.itemId,
      itemName: entity.itemName,
      systemQty: Number(entity.systemQty),
      actualQty: Number(entity.actualQty),
      varianceQty: Number(entity.varianceQty),
      uom: entity.uom,
    });
  }
}
