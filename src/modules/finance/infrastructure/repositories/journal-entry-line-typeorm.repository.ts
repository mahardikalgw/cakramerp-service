import { Injectable } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { JournalEntryLineTypeOrmEntity } from '../entities/journal-entry-line-typeorm.entity';
import { JournalEntryTypeOrmEntity } from '../entities/journal-entry-typeorm.entity';
import { JournalEntryLine } from '../../domain/entities/journal-entry-line.entity';
import { JournalEntryLineRepositoryPort } from '../../domain/repositories/finance-repository.port';
import { Decimal } from 'decimal.js';

@Injectable()
export class JournalEntryLineTypeOrmRepository implements JournalEntryLineRepositoryPort {
  private readonly repo: Repository<JournalEntryLineTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(JournalEntryLineTypeOrmEntity);
  }

  async findByDateRange(
    start: Date,
    end: Date,
    filters?: { segment?: string; projectId?: string; costCenter?: string },
  ): Promise<JournalEntryLine[]> {
    let query = this.repo
      .createQueryBuilder('line')
      .innerJoin(JournalEntryTypeOrmEntity, 'je', 'je.id = line.journalEntryId')
      .where('je.date BETWEEN :start AND :end', { start, end });

    if (filters?.segment) {
      query = query.andWhere('je.segment = :segment', {
        segment: filters.segment,
      });
    }
    if (filters?.projectId) {
      query = query.andWhere('je.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }
    if (filters?.costCenter) {
      query = query.andWhere('je.costCenter = :costCenter', {
        costCenter: filters.costCenter,
      });
    }

    const entities = await query.getMany();
    return entities.map((e) => this.toDomain(e));
  }

  async findByAccountIdsAndDateRange(
    accountIds: string[],
    start: Date,
    end: Date,
  ): Promise<JournalEntryLine[]> {
    if (accountIds.length === 0) return [];

    const entities = await this.repo
      .createQueryBuilder('line')
      .innerJoin(JournalEntryTypeOrmEntity, 'je', 'je.id = line.journalEntryId')
      .where('line.accountId IN (:...accountIds)', { accountIds })
      .andWhere('je.date BETWEEN :start AND :end', { start, end })
      .getMany();

    return entities.map((e) => this.toDomain(e));
  }

  async findByJournalEntryId(
    journalEntryId: string,
  ): Promise<JournalEntryLine[]> {
    const entities = await this.repo.find({
      where: { journalEntryId },
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async save(line: JournalEntryLine): Promise<JournalEntryLine> {
    const saved = await this.repo.save(this.toEntity(line));
    return this.toDomain(saved);
  }

  async saveMany(lines: JournalEntryLine[]): Promise<JournalEntryLine[]> {
    const saved = await this.repo.save(lines.map((l) => this.toEntity(l)));
    return saved.map((e) => this.toDomain(e));
  }

  async deleteByJournalEntryId(journalEntryId: string): Promise<void> {
    await this.repo.delete({ journalEntryId });
  }

  async sumByAccountIdsAndDateRange(
    accountIds: string[],
    start: Date,
    end: Date,
  ): Promise<{ accountId: string; totalDebit: number; totalCredit: number }[]> {
    if (accountIds.length === 0) return [];

    const rows = await this.repo
      .createQueryBuilder('line')
      .innerJoin(JournalEntryTypeOrmEntity, 'je', 'je.id = line.journalEntryId')
      .select('line.accountId', 'accountId')
      .addSelect('SUM(line.debit)', 'totalDebit')
      .addSelect('SUM(line.credit)', 'totalCredit')
      .where('line.accountId IN (:...accountIds)', { accountIds })
      .andWhere('je.date BETWEEN :start AND :end', { start, end })
      .groupBy('line.accountId')
      .getRawMany();

    return rows.map((r: any) => ({
      accountId: r.accountId,
      totalDebit: parseFloat(r.totalDebit) || 0,
      totalCredit: parseFloat(r.totalCredit) || 0,
    }));
  }

  private toDomain(entity: JournalEntryLineTypeOrmEntity): JournalEntryLine {
    return new JournalEntryLine({
      id: entity.id,
      journalEntryId: entity.journalEntryId,
      accountId: entity.accountId,
      debit: new Decimal(entity.debit),
      credit: new Decimal(entity.credit),
      description: entity.description ?? undefined,
      createdAt: entity.createdAt,
    });
  }

  private toEntity(domain: JournalEntryLine): JournalEntryLineTypeOrmEntity {
    return this.repo.create({
      id: domain.id,
      journalEntryId: domain.journalEntryId,
      accountId: domain.accountId,
      debit: domain.debit.toNumber(),
      credit: domain.credit.toNumber(),
      description: domain.description,
      createdAt: domain.createdAt,
    });
  }
}
