import { Injectable } from '@nestjs/common'
import { Repository, DataSource, Between } from 'typeorm'
import { JournalEntryTypeOrmEntity } from '../entities/journal-entry-typeorm.entity'
import { JournalEntry } from '../../domain/entities/journal-entry.entity'
import { JournalEntryRepositoryPort } from '../../domain/repositories/finance-repository.port'
import { Decimal } from 'decimal.js'

@Injectable()
export class JournalEntryTypeOrmRepository implements JournalEntryRepositoryPort {
  private readonly repo: Repository<JournalEntryTypeOrmEntity>

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(JournalEntryTypeOrmEntity)
  }

  async findById(id: string): Promise<JournalEntry | null> {
    const entity = await this.repo.findOne({ where: { id } })
    return entity ? this.toDomain(entity) : null
  }

  async findAll(filters?: {
    dateFrom?: Date
    dateTo?: Date
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: JournalEntry[]; total: number }> {
    const qb = this.repo.createQueryBuilder('je')

    if (filters?.dateFrom && filters?.dateTo) {
      qb.andWhere('je.date BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      })
    } else if (filters?.dateFrom) {
      qb.andWhere('je.date >= :dateFrom', { dateFrom: filters.dateFrom })
    } else if (filters?.dateTo) {
      qb.andWhere('je.date <= :dateTo', { dateTo: filters.dateTo })
    }

    if (filters?.status) {
      qb.andWhere('je.status = :status', { status: filters.status })
    }

    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20

    qb.orderBy('je.date', 'DESC').addOrderBy('je.entryNumber', 'DESC')
    qb.skip((page - 1) * limit).take(limit)

    const [entities, total] = await qb.getManyAndCount()
    return { data: entities.map(this.toDomain), total }
  }

  async save(entry: JournalEntry): Promise<JournalEntry> {
    const saved = await this.repo.save(this.toEntity(entry))
    return this.toDomain(saved)
  }

  async getNextEntryNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `JE-${year}-`
    const last = await this.repo
      .createQueryBuilder('je')
      .where('je.entryNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('je.entryNumber', 'DESC')
      .getOne()

    if (!last) return `${prefix}0001`
    const seq = parseInt(last.entryNumber.replace(prefix, ''), 10) + 1
    return `${prefix}${seq.toString().padStart(4, '0')}`
  }

  async countByAccountId(accountId: string): Promise<number> {
    // This would need a join with journal_entry_lines
    return 0
  }

  private toDomain(entity: JournalEntryTypeOrmEntity): JournalEntry {
    return new JournalEntry({
      id: entity.id,
      entryNumber: entity.entryNumber,
      date: entity.date,
      description: entity.description,
      reference: entity.reference ?? undefined,
      status: entity.status as any,
      projectId: entity.projectId ?? undefined,
      segment: entity.segment ?? undefined,
      costCenter: entity.costCenter ?? undefined,
      createdBy: entity.createdBy,
      approvedBy: entity.approvedBy ?? undefined,
      approvedAt: entity.approvedAt ?? undefined,
      reversalOfId: entity.reversalOfId ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    })
  }

  private toEntity(domain: JournalEntry): JournalEntryTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      entryNumber: domain.entryNumber,
      date: domain.date,
      description: domain.description,
      reference: domain.reference,
      status: domain.status,
      projectId: domain.projectId,
      segment: domain.segment,
      costCenter: domain.costCenter,
      createdBy: domain.createdBy,
      approvedBy: domain.approvedBy,
      approvedAt: domain.approvedAt,
      reversalOfId: domain.reversalOfId,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    })
  }
}
