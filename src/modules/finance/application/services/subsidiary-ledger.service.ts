import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { SubsidiaryLedgerServicePort } from '../ports/subsidiary-ledger-service.port';
import { ArSubsidiaryLedgerTypeOrmEntity } from '../../infrastructure/entities/ar-subsidiary-ledger-typeorm.entity';
import { ApSubsidiaryLedgerTypeOrmEntity } from '../../infrastructure/entities/ap-subsidiary-ledger-typeorm.entity';

@Injectable()
export class SubsidiaryLedgerService implements SubsidiaryLedgerServicePort {
  private readonly arRepo: Repository<ArSubsidiaryLedgerTypeOrmEntity>;
  private readonly apRepo: Repository<ApSubsidiaryLedgerTypeOrmEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.arRepo = dataSource.getRepository(ArSubsidiaryLedgerTypeOrmEntity);
    this.apRepo = dataSource.getRepository(ApSubsidiaryLedgerTypeOrmEntity);
  }

  async getArLedger(filters?: {
    customerId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.arRepo.createQueryBuilder('ar');

    if (filters?.customerId) {
      qb.andWhere('ar.customerId = :customerId', {
        customerId: filters.customerId,
      });
    }
    if (filters?.invoiceId) {
      qb.andWhere('ar.invoiceId = :invoiceId', {
        invoiceId: filters.invoiceId,
      });
    }
    if (filters?.startDate) {
      qb.andWhere('ar.date >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      qb.andWhere('ar.date <= :endDate', { endDate: filters.endDate });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('ar.date', 'ASC').addOrderBy('ar.createdAt', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getApLedger(filters?: {
    supplierId?: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const qb = this.apRepo.createQueryBuilder('ap');

    if (filters?.supplierId) {
      qb.andWhere('ap.supplierId = :supplierId', {
        supplierId: filters.supplierId,
      });
    }
    if (filters?.invoiceId) {
      qb.andWhere('ap.invoiceId = :invoiceId', {
        invoiceId: filters.invoiceId,
      });
    }
    if (filters?.startDate) {
      qb.andWhere('ap.date >= :startDate', { startDate: filters.startDate });
    }
    if (filters?.endDate) {
      qb.andWhere('ap.date <= :endDate', { endDate: filters.endDate });
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    qb.orderBy('ap.date', 'ASC').addOrderBy('ap.createdAt', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getArCustomerSummary(): Promise<any[]> {
    const result = await this.dataSource.query(`
      SELECT
        customer_id as "customerId",
        customer_name as "customerName",
        COALESCE(SUM(debit), 0) as "totalDebit",
        COALESCE(SUM(credit), 0) as "totalCredit",
        COALESCE(SUM(debit) - SUM(credit), 0) as "outstandingBalance",
        COUNT(*) as "transactionCount"
      FROM ar_subsidiary_ledger
      GROUP BY customer_id, customer_name
      ORDER BY "outstandingBalance" DESC
    `);
    return result;
  }

  async getApSupplierSummary(): Promise<any[]> {
    const result = await this.dataSource.query(`
      SELECT
        supplier_id as "supplierId",
        supplier_name as "supplierName",
        COALESCE(SUM(credit), 0) as "totalCredit",
        COALESCE(SUM(debit), 0) as "totalDebit",
        COALESCE(SUM(credit) - SUM(debit), 0) as "outstandingBalance",
        COUNT(*) as "transactionCount"
      FROM ap_subsidiary_ledger
      GROUP BY supplier_id, supplier_name
      ORDER BY "outstandingBalance" DESC
    `);
    return result;
  }

  async getArInvoiceBalance(
    invoiceId: string,
  ): Promise<{ debit: number; credit: number; balance: number }> {
    const result = await this.dataSource.query(
      `
      SELECT
        COALESCE(SUM(debit), 0) as "debit",
        COALESCE(SUM(credit), 0) as "credit",
        COALESCE(SUM(debit) - SUM(credit), 0) as "balance"
      FROM ar_subsidiary_ledger
      WHERE invoice_id = $1
    `,
      [invoiceId],
    );
    return result[0] ?? { debit: 0, credit: 0, balance: 0 };
  }

  async getApInvoiceBalance(
    invoiceId: string,
  ): Promise<{ debit: number; credit: number; balance: number }> {
    const result = await this.dataSource.query(
      `
      SELECT
        COALESCE(SUM(credit), 0) as "credit",
        COALESCE(SUM(debit), 0) as "debit",
        COALESCE(SUM(credit) - SUM(debit), 0) as "balance"
      FROM ap_subsidiary_ledger
      WHERE invoice_id = $1
    `,
      [invoiceId],
    );
    return result[0] ?? { debit: 0, credit: 0, balance: 0 };
  }

  async recordArEntry(data: {
    customerId: string;
    customerName: string;
    journalEntryId?: string;
    glPostingQueueId?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
  }): Promise<any> {
    // Calculate running balance for this customer
    const lastEntry = await this.arRepo
      .createQueryBuilder('ar')
      .where('ar.customerId = :customerId', { customerId: data.customerId })
      .orderBy('ar.date', 'DESC')
      .addOrderBy('ar.createdAt', 'DESC')
      .getOne();

    const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
    const balance = previousBalance + data.debit - data.credit;

    const entry = this.arRepo.create({
      customerId: data.customerId,
      customerName: data.customerName,
      journalEntryId: data.journalEntryId,
      glPostingQueueId: data.glPostingQueueId,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      date: new Date(data.date),
      description: data.description,
      debit: data.debit,
      credit: data.credit,
      balance,
    });

    return this.arRepo.save(entry);
  }

  async recordApEntry(data: {
    supplierId: string;
    supplierName: string;
    journalEntryId?: string;
    glPostingQueueId?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
  }): Promise<any> {
    // Calculate running balance for this supplier
    const lastEntry = await this.apRepo
      .createQueryBuilder('ap')
      .where('ap.supplierId = :supplierId', { supplierId: data.supplierId })
      .orderBy('ap.date', 'DESC')
      .addOrderBy('ap.createdAt', 'DESC')
      .getOne();

    const previousBalance = lastEntry ? Number(lastEntry.balance) : 0;
    const balance = previousBalance + data.credit - data.debit;

    const entry = this.apRepo.create({
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      journalEntryId: data.journalEntryId,
      glPostingQueueId: data.glPostingQueueId,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      date: new Date(data.date),
      description: data.description,
      debit: data.debit,
      credit: data.credit,
      balance,
    });

    return this.apRepo.save(entry);
  }
}
