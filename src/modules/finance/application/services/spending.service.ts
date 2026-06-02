import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SpendingTypeOrmEntity } from '../../infrastructure/entities/spending-typeorm.entity';
import { GlPostingQueueTypeOrmEntity } from '../../infrastructure/entities/gl-posting-queue-typeorm.entity';

const CATEGORY_ACCOUNT_MAP: Record<string, { code: string; name: string }> = {
  office: { code: '6100', name: 'Biaya Operasional Kantor' },
  marketing: { code: '6200', name: 'Biaya Marketing' },
  transport: { code: '6300', name: 'Biaya Transportasi' },
  utility: { code: '6400', name: 'Biaya Utilitas' },
  maintenance: { code: '6500', name: 'Biaya Pemeliharaan' },
  other: { code: '6600', name: 'Biaya Lain-lain' },
};

@Injectable()
export class SpendingService {
  private readonly spendingRepo: Repository<SpendingTypeOrmEntity>;
  private readonly queueRepo: Repository<GlPostingQueueTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.spendingRepo = dataSource.getRepository(SpendingTypeOrmEntity);
    this.queueRepo = dataSource.getRepository(GlPostingQueueTypeOrmEntity);
  }

  async findAll(filters?: {
    search?: string;
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.spendingRepo.createQueryBuilder('sp');

    if (filters?.search) {
      qb.andWhere(
        '(sp.description ILIKE :search OR sp.spendingNumber ILIKE :search OR sp.reference ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters?.category) {
      qb.andWhere('sp.category = :category', { category: filters.category });
    }
    if (filters?.status) {
      qb.andWhere('sp.status = :status', { status: filters.status });
    }
    if (filters?.startDate) {
      qb.andWhere('sp.date >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      qb.andWhere('sp.date <= :endDate', { endDate: filters.endDate });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('sp.date', 'DESC').addOrderBy('sp.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<any> {
    const spending = await this.spendingRepo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    return spending;
  }

  async create(data: {
    date: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
  }): Promise<any> {
    const spendingNumber = await this.generateSpendingNumber();

    // Just save as draft — no GL Posting Queue yet
    return this.spendingRepo.save(
      this.spendingRepo.create({
        spendingNumber,
        date: new Date(data.date),
        category: data.category,
        description: data.description,
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? 'cash',
        reference: data.reference,
        notes: data.notes,
        status: 'draft',
      }),
    );
  }

  async update(
    id: string,
    data: {
      date?: string;
      category?: string;
      description?: string;
      amount?: number;
      paymentMethod?: string;
      reference?: string;
      notes?: string;
    },
  ): Promise<any> {
    const spending = await this.spendingRepo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    if (spending.status !== 'draft') {
      throw new BadRequestException('Only draft spendings can be edited');
    }

    const updateData: any = {};
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.paymentMethod !== undefined)
      updateData.paymentMethod = data.paymentMethod;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.notes !== undefined) updateData.notes = data.notes;

    Object.assign(spending, updateData);
    return this.spendingRepo.save(spending);
  }

  async postToGL(id: string): Promise<any> {
    const spending = await this.spendingRepo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    if (spending.status !== 'draft') {
      throw new BadRequestException('Only draft spendings can be posted to GL');
    }

    const accountInfo =
      CATEGORY_ACCOUNT_MAP[spending.category] ?? CATEGORY_ACCOUNT_MAP['other'];

    const queueEntry = await this.queueRepo.save(
      this.queueRepo.create({
        sourceType: 'spending',
        sourceId: spending.id,
        sourceNumber: spending.spendingNumber,
        eventType: 'spending_recorded',
        amount: Number(spending.amount),
        description: `${spending.spendingNumber} - ${spending.description}`,
        suggestedLines: [
          {
            accountId: '',
            accountCode: accountInfo.code,
            accountName: accountInfo.name,
            debit: Number(spending.amount),
            credit: 0,
            description: spending.description,
          },
          {
            accountId: '',
            accountCode: '1100',
            accountName: 'Kas & Bank',
            debit: 0,
            credit: Number(spending.amount),
            description: `Pembayaran ${spending.paymentMethod} - ${spending.description}`,
          },
        ],
        status: 'pending',
      }),
    );

    spending.status = 'recorded';
    spending.glPostingQueueId = queueEntry.id;
    await this.spendingRepo.save(spending);

    return spending;
  }

  async delete(id: string): Promise<void> {
    const spending = await this.spendingRepo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');
    if (spending.status === 'posted') {
      throw new BadRequestException('Cannot delete a posted spending');
    }

    if (spending.glPostingQueueId) {
      await this.queueRepo.update(spending.glPostingQueueId, {
        status: 'cancelled',
      });
    }

    await this.spendingRepo.remove(spending);
  }

  async markPosted(id: string, journalEntryId: string): Promise<any> {
    const spending = await this.spendingRepo.findOne({ where: { id } });
    if (!spending) throw new NotFoundException('Spending not found');

    spending.status = 'posted';
    spending.journalEntryId = journalEntryId;
    return this.spendingRepo.save(spending);
  }

  private async generateSpendingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SPD-${year}-`;
    const last = await this.spendingRepo
      .createQueryBuilder('sp')
      .where('sp.spendingNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('sp.spendingNumber', 'DESC')
      .getOne();

    if (!last) return `${prefix}0001`;
    const seq = parseInt(last.spendingNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
