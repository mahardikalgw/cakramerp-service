import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SpendingTypeOrmEntity } from '../../infrastructure/entities/spending-typeorm.entity';
import { GL_POSTING_QUEUE_SERVICE } from '../../../finance/application/ports/gl-posting-queue-service.port';
import type { GlPostingQueueServicePort } from '../../../finance/application/ports/gl-posting-queue-service.port';

@Injectable()
export class SpendingService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(GL_POSTING_QUEUE_SERVICE)
    private readonly glPostingQueueService: GlPostingQueueServicePort,
  ) {}

  async findAll(filters?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    const qb = repo.createQueryBuilder('s');

    if (filters?.search) {
      qb.where(
        '(s.spendingNumber ILIKE :search OR s.vendor ILIKE :search OR s.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      qb.andWhere('s.status = :status', { status: filters.status });
    }

    qb.orderBy('s.createdAt', 'DESC');
    qb.skip(skip);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<any> {
    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    const spending = await repo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    return spending;
  }

  async create(data: {
    expenseCategory: string;
    amount: number;
    spendingDate: string;
    description?: string;
    vendor?: string;
    referenceNo?: string;
    paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  }): Promise<any> {
    const spendingNumber = await this.generateSpendingNumber();

    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    const spending = repo.create({
      spendingNumber,
      expenseCategory: data.expenseCategory,
      amount: data.amount,
      spendingDate: new Date(data.spendingDate),
      description: data.description,
      vendor: data.vendor,
      referenceNo: data.referenceNo,
      status: 'draft',
      paymentMethod: data.paymentMethod,
    });

    const saved = await repo.save(spending);
    return saved;
  }

  async update(
    id: string,
    data: {
      expenseCategory?: string;
      amount?: number;
      spendingDate?: string;
      description?: string;
      vendor?: string;
      referenceNo?: string;
      paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
    },
  ): Promise<any> {
    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    const spending = await repo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    if (spending.status !== 'draft') {
      throw new BadRequestException('Only draft spendings can be updated');
    }

    if (data.expenseCategory !== undefined)
      spending.expenseCategory = data.expenseCategory;
    if (data.amount !== undefined) spending.amount = data.amount;
    if (data.spendingDate !== undefined)
      spending.spendingDate = new Date(data.spendingDate);
    if (data.description !== undefined) spending.description = data.description;
    if (data.vendor !== undefined) spending.vendor = data.vendor;
    if (data.referenceNo !== undefined) spending.referenceNo = data.referenceNo;
    if (data.paymentMethod !== undefined)
      spending.paymentMethod = data.paymentMethod;

    await repo.save(spending);
    return spending;
  }

  async approve(id: string): Promise<any> {
    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    const spending = await repo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    if (spending.status !== 'draft') {
      throw new BadRequestException('Only draft spendings can be approved');
    }

    spending.status = 'approved';
    await repo.save(spending);

    return spending;
  }

  async reject(id: string): Promise<any> {
    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    const spending = await repo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    if (spending.status !== 'draft') {
      throw new BadRequestException('Only draft spendings can be rejected');
    }

    spending.status = 'rejected';
    await repo.save(spending);

    return spending;
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    const spending = await repo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    if (spending.status !== 'draft' && spending.status !== 'rejected') {
      throw new BadRequestException(
        'Only draft or rejected spendings can be deleted',
      );
    }

    await repo.remove(spending);
  }

  async createGlPostingEntry(spendingId: string): Promise<void> {
    const spending = await this.findById(spendingId);

    const glEntry = await this.glPostingQueueService.createEntry({
      sourceType: 'spending',
      sourceId: spending.id,
      sourceNumber: spending.spendingNumber,
      eventType: 'spending_approved',
      amount: Number(spending.amount),
      description: `Spending ${spending.spendingNumber} - ${spending.expenseCategory}`,
      suggestedLines: [
        {
          accountId: '6000',
          accountCode: '6000',
          accountName: 'Operating Expenses',
          debit: Number(spending.amount),
          credit: 0,
          description: `Expense: ${spending.expenseCategory} via ${spending.spendingNumber}`,
        },
        {
          accountId: '2100',
          accountCode: '2100',
          accountName: 'Accounts Payable',
          debit: 0,
          credit: Number(spending.amount),
          description: `AP for spending ${spending.spendingNumber}`,
        },
      ],
    });

    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);
    await repo.update(spendingId, { glPostingQueueId: glEntry.id });
  }

  private async generateSpendingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;
    const repo = this.dataSource.getRepository(SpendingTypeOrmEntity);

    const result = await repo
      .createQueryBuilder('s')
      .select('s.spendingNumber', 'spendingNumber')
      .where('s.spendingNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('s.spendingNumber', 'DESC')
      .limit(1)
      .getRawOne();

    if (!result?.spendingNumber) return `${prefix}0001`;
    const seq = parseInt(result.spendingNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
