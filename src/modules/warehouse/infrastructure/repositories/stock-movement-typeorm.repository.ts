import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockMovementRepositoryPort } from '../../domain/repositories/stock-movement-repository.port';
import { StockLedgerTypeOrmEntity } from '../entities/stock-ledger-typeorm.entity';
import { ItemStockBalanceTypeOrmEntity } from '../entities/item-stock-balance-typeorm.entity';
import { ItemTypeOrmEntity } from '../entities/item-typeorm.entity';
import { WarehouseTypeOrmEntity } from '../entities/warehouse-typeorm.entity';

@Injectable()
export class StockMovementTypeOrmRepository implements StockMovementRepositoryPort {
  private readonly ledgerRepo: Repository<StockLedgerTypeOrmEntity>;
  private readonly balanceRepo: Repository<ItemStockBalanceTypeOrmEntity>;
  private readonly itemRepo: Repository<ItemTypeOrmEntity>;
  private readonly warehouseRepo: Repository<WarehouseTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.ledgerRepo = dataSource.getRepository(StockLedgerTypeOrmEntity);
    this.balanceRepo = dataSource.getRepository(ItemStockBalanceTypeOrmEntity);
    this.itemRepo = dataSource.getRepository(ItemTypeOrmEntity);
    this.warehouseRepo = dataSource.getRepository(WarehouseTypeOrmEntity);
  }

  async getBalance(itemId: string, warehouseId: string): Promise<number> {
    const balance = await this.balanceRepo.findOne({
      where: { itemId, warehouseId },
    });

    return balance ? Number(balance.quantity) : 0;
  }

  async getBalances(filters?: {
    warehouseId?: string;
    category?: string;
    belowMinimum?: boolean;
  }): Promise<any[]> {
    const qb = this.balanceRepo
      .createQueryBuilder('bal')
      .innerJoin(ItemTypeOrmEntity, 'item', 'item.id = bal.itemId')
      .innerJoin(WarehouseTypeOrmEntity, 'wh', 'wh.id = bal.warehouseId')
      .select([
        'bal.id AS "id"',
        'bal.itemId AS "itemId"',
        'item.code AS "itemCode"',
        'item.name AS "itemName"',
        'item.category AS "category"',
        'item.uom AS "uom"',
        'item.minStockLevel AS "minStockLevel"',
        'bal.warehouseId AS "warehouseId"',
        'wh.name AS "warehouseName"',
        'bal.quantity AS "currentQty"',
        'bal.lastMovementDate AS "lastMovementDate"',
      ]);

    if (filters?.warehouseId) {
      qb.andWhere('bal.warehouseId = :warehouseId', {
        warehouseId: filters.warehouseId,
      });
    }
    if (filters?.category) {
      qb.andWhere('item.category = :category', { category: filters.category });
    }
    if (filters?.belowMinimum) {
      qb.andWhere('bal.quantity < item.minStockLevel');
    }

    return qb.getRawMany();
  }

  async getStockCard(itemId: string): Promise<any[]> {
    return this.ledgerRepo.find({
      where: { itemId },
      order: { createdAt: 'DESC' },
    });
  }

  async upsertBalance(
    itemId: string,
    warehouseId: string,
    quantityDelta: number,
  ): Promise<void> {
    let balance = await this.balanceRepo.findOne({
      where: { itemId, warehouseId },
    });

    if (balance) {
      balance.quantity = Number(balance.quantity) + quantityDelta;
      balance.lastMovementDate = new Date();
    } else {
      balance = this.balanceRepo.create({
        itemId,
        warehouseId,
        quantity: quantityDelta,
        lastMovementDate: new Date(),
      });
    }

    await this.balanceRepo.save(balance);
  }

  async createLedgerEntry(data: {
    itemId: string;
    warehouseId: string;
    movementType: string;
    quantity: number;
    balanceAfter: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    createdBy: string;
  }): Promise<any> {
    const ledgerEntry = this.ledgerRepo.create({
      itemId: data.itemId,
      warehouseId: data.warehouseId,
      movementType: data.movementType,
      quantity: data.quantity,
      balanceAfter: data.balanceAfter,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      description: data.description,
      createdBy: data.createdBy,
    });

    return this.ledgerRepo.save(ledgerEntry);
  }
}
