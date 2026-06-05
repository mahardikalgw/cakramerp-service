import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BaseTypeOrmRepositoryAdapter } from '../../../../database/infrastructure/repositories/base.typeorm-repository.adapter';
import { Quotation } from '../../domain/entities/quotation.entity';
import { QuotationLine } from '../../domain/entities/quotation-line.entity';
import { QuotationTypeOrmEntity } from '../entities/quotation-typeorm.entity';
import { QuotationLineTypeOrmEntity } from '../entities/quotation-line-typeorm.entity';
import { QuotationRepositoryPort } from '../../domain/repositories/quotation-repository.port';

@Injectable()
export class QuotationTypeOrmRepository
  extends BaseTypeOrmRepositoryAdapter<Quotation, QuotationTypeOrmEntity>
  implements QuotationRepositoryPort
{
  protected readonly repository: Repository<QuotationTypeOrmEntity>;

  constructor(dataSource: DataSource) {
    super(dataSource);
    this.repository = dataSource.getRepository(QuotationTypeOrmEntity);
  }

  toDomain(entity: QuotationTypeOrmEntity): Quotation {
    return new Quotation({
      id: entity.id,
      quotationNumber: entity.quotationNumber,
      customerId: entity.customerId,
      customerName: entity.customerName,
      quotationDate: entity.quotationDate,
      validUntil: entity.validUntil,
      status: entity.status as Quotation['status'],
      totalAmount: Number(entity.totalAmount),
      discountAmount: Number(entity.discountAmount),
      taxAmount: Number(entity.taxAmount),
      grandTotal: Number(entity.grandTotal),
      notes: entity.notes,
      lines: Array.isArray(entity.lines)
        ? entity.lines.map(
            (line) =>
              new QuotationLine({
                id: line.id,
                quotationId: line.quotationId,
                itemId: line.itemId,
                itemName: line.itemName,
                description: line.description,
                quantity: Number(line.quantity),
                uom: line.uom,
                unitPrice: Number(line.unitPrice),
                taxPercent: Number(line.taxPercent),
                amount: Number(line.amount),
                discountAmount: Number(line.discountAmount),
                lineType: line.lineType,
              }),
          )
        : [],
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: Quotation): QuotationTypeOrmEntity {
    const entity = new QuotationTypeOrmEntity();
    entity.id = domain.id;
    entity.quotationNumber = domain.quotationNumber;
    entity.customerId = domain.customerId;
    entity.customerName = domain.customerName;
    entity.quotationDate = domain.quotationDate;
    entity.validUntil = domain.validUntil;
    entity.status = domain.status;
    entity.totalAmount = domain.totalAmount;
    entity.discountAmount = domain.discountAmount;
    entity.taxAmount = domain.taxAmount;
    entity.grandTotal = domain.grandTotal;
    entity.notes = domain.notes;
    entity.lines = domain.lines.map((line) => {
      const lineEntity = new QuotationLineTypeOrmEntity();
      lineEntity.id = line.id;
      lineEntity.quotationId = line.quotationId ?? domain.id;
      lineEntity.itemId = line.itemId;
      lineEntity.itemName = line.itemName;
      lineEntity.description = line.description;
      lineEntity.quantity = line.quantity;
      lineEntity.uom = line.uom;
      lineEntity.unitPrice = line.unitPrice;
      lineEntity.taxPercent = line.taxPercent;
      lineEntity.amount = line.amount;
      lineEntity.discountAmount = line.discountAmount;
      lineEntity.lineType = line.lineType;
      return lineEntity;
    });
    return entity;
  }

  async findByQuotationNumber(
    quotationNumber: string,
  ): Promise<Quotation | null> {
    const entity = await this.repository.findOne({
      where: { quotationNumber },
      relations: ['lines'],
    });
    return entity ? this.toDomain(entity) : null;
  }

  async getLastQuotationNumber(prefix: string): Promise<string | null> {
    const query = this.repository
      .createQueryBuilder('q')
      .select('q.quotationNumber', 'quotationNumber')
      .where('q.quotationNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('q.quotationNumber', 'DESC')
      .limit(1);

    const row = await query.getRawOne();
    return row?.quotationNumber ?? null;
  }
}
