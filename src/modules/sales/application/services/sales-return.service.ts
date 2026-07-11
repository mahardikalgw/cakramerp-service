import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SalesReturnTypeOrmEntity } from '../../infrastructure/entities/sales-return-typeorm.entity';
import { SalesReturnLineTypeOrmEntity } from '../../infrastructure/entities/sales-return-line-typeorm.entity';
import { GlPostingQueueTypeOrmEntity } from '../../../finance/infrastructure/entities/gl-posting-queue-typeorm.entity';
import { CreateSalesReturnHttpDto } from '../../infrastructure/http/dtos/sales-return.dto';
import {
  SequenceGenerator,
  ADVISORY_LOCK_KEYS,
} from '../../../../shared/kernel/infrastructure/database/sequence-generator';

@Injectable()
export class SalesReturnService {
  private readonly returnRepo: Repository<SalesReturnTypeOrmEntity>;
  private readonly returnLineRepo: Repository<SalesReturnLineTypeOrmEntity>;
  private readonly queueRepo: Repository<GlPostingQueueTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.returnRepo = dataSource.getRepository(SalesReturnTypeOrmEntity);
    this.returnLineRepo = dataSource.getRepository(
      SalesReturnLineTypeOrmEntity,
    );
    this.queueRepo = dataSource.getRepository(GlPostingQueueTypeOrmEntity);
  }

  async findAll(filters?: {
    search?: string;
    status?: string;
    customerId?: string;
    salesOrderId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: SalesReturnTypeOrmEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const qb = this.returnRepo.createQueryBuilder('sr');

    if (filters?.search) {
      qb.where(
        '(sr.returnNumber ILIKE :search OR sr.customerName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      qb.andWhere('sr.status = :status', { status: filters.status });
    }
    if (filters?.customerId) {
      qb.andWhere('sr.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters?.salesOrderId) {
      qb.andWhere('sr.salesOrderId = :salesOrderId', {
        salesOrderId: filters.salesOrderId,
      });
    }

    qb.orderBy('sr.returnDate', 'DESC');
    qb.leftJoinAndSelect('sr.lines', 'lines');
    qb.andWhere('sr.deletedAt IS NULL');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<SalesReturnTypeOrmEntity> {
    const entity = await this.returnRepo.findOne({
      where: { id },
      relations: ['lines'],
    });
    if (!entity) throw new NotFoundException('Sales return not found');
    return entity;
  }

  async create(
    dto: CreateSalesReturnHttpDto,
  ): Promise<SalesReturnTypeOrmEntity> {
    const returnNumber = await this.generateReturnNumber();

    let totalAmount = 0;
    const lineEntities: Partial<SalesReturnLineTypeOrmEntity>[] = [];

    for (const line of dto.lines) {
      const lineAmount = line.quantity * line.unitPrice;
      totalAmount += lineAmount;

      lineEntities.push({
        itemId: line.itemId ?? null,
        itemName: line.itemName,
        quantity: line.quantity,
        uom: line.uom ?? null,
        unitPrice: line.unitPrice,
        amount: lineAmount,
        reason: line.reason ?? null,
      });
    }

    const salesReturn = this.returnRepo.create({
      returnNumber,
      salesOrderId: dto.salesOrderId ?? null,
      customerId: dto.customerId,
      customerName: dto.customerName ?? '',
      returnDate: new Date(dto.returnDate),
      status: 'draft',
      totalAmount,
      reason: dto.reason ?? null,
    });

    const savedReturn = await this.returnRepo.save(salesReturn);

    for (const line of lineEntities) {
      await this.returnLineRepo.save(
        this.returnLineRepo.create({
          ...line,
          salesReturnId: savedReturn.id,
        }),
      );
    }

    return this.findById(savedReturn.id);
  }

  async update(
    id: string,
    dto: Partial<CreateSalesReturnHttpDto>,
  ): Promise<SalesReturnTypeOrmEntity> {
    const entity = await this.returnRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales return not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales returns can be edited');
    }

    if (dto.customerId !== undefined) entity.customerId = dto.customerId;
    if (dto.customerName !== undefined) entity.customerName = dto.customerName;
    if (dto.returnDate !== undefined)
      entity.returnDate = new Date(dto.returnDate);
    if (dto.reason !== undefined) entity.reason = dto.reason ?? null;

    if (dto.lines) {
      const existingLines = await this.returnLineRepo.find({
        where: { salesReturnId: id },
      });
      for (const line of existingLines) {
        await this.returnLineRepo.softDelete(line.id);
      }

      let totalAmount = 0;

      for (const line of dto.lines) {
        const lineAmount = line.quantity * line.unitPrice;
        totalAmount += lineAmount;

        await this.returnLineRepo.save(
          this.returnLineRepo.create({
            salesReturnId: id,
            itemId: line.itemId ?? null,
            itemName: line.itemName,
            quantity: line.quantity,
            uom: line.uom ?? null,
            unitPrice: line.unitPrice,
            amount: lineAmount,
            reason: line.reason ?? null,
          }),
        );
      }

      entity.totalAmount = totalAmount;
    }

    await this.returnRepo.save(entity);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.returnRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales return not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales returns can be deleted');
    }
    await this.returnRepo.softDelete(id);
  }

  async approve(
    id: string,
    approverId: string,
  ): Promise<SalesReturnTypeOrmEntity> {
    const entity = await this.returnRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales return not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales returns can be approved');
    }
    entity.status = 'approved';
    entity.approvedBy = approverId;
    entity.approvedAt = new Date();
    await this.returnRepo.save(entity);
    return this.findById(id);
  }

  async reject(
    id: string,
    approverId: string,
    reason?: string,
  ): Promise<SalesReturnTypeOrmEntity> {
    const entity = await this.returnRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Sales return not found');
    if (entity.status !== 'draft') {
      throw new BadRequestException('Only draft sales returns can be rejected');
    }
    entity.status = 'rejected';
    entity.approvedBy = approverId;
    entity.approvedAt = new Date();
    entity.rejectionReason = reason ?? null;
    if (reason) {
      entity.reason = entity.reason
        ? `${entity.reason}\nRejection: ${reason}`
        : `Rejection: ${reason}`;
    }
    await this.returnRepo.save(entity);
    return this.findById(id);
  }

  private async enqueueGlPosting(
    salesReturn: SalesReturnTypeOrmEntity,
  ): Promise<void> {
    const amount = Number(salesReturn.totalAmount);

    const suggestedLines = [
      {
        accountId: '',
        accountCode: '4200',
        accountName: 'Sales Return',
        debit: amount,
        credit: 0,
        description: `Sales Return ${salesReturn.returnNumber}`,
      },
      {
        accountId: '',
        accountCode: '1200',
        accountName: 'Accounts Receivable',
        debit: 0,
        credit: amount,
        description: `AR reduction - ${salesReturn.returnNumber}`,
      },
    ];

    await this.queueRepo.save(
      this.queueRepo.create({
        sourceType: 'sales_return',
        sourceId: salesReturn.id,
        sourceNumber: salesReturn.returnNumber,
        eventType: 'sales_return_created',
        amount,
        description: `${salesReturn.returnNumber} - ${salesReturn.customerName}`,
        suggestedLines,
        status: 'pending',
        customerId: salesReturn.customerId,
      }),
    );
  }

  private async generateReturnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const seq = new SequenceGenerator(this.dataSource, {
      prefix: `SRTN-${year}-`,
      padLength: 4,
      lockKey: ADVISORY_LOCK_KEYS.SALES_RETURN,
    });
    return seq.next('return_number', 'sales_returns');
  }
}
