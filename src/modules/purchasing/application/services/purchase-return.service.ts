import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PurchaseReturnTypeOrmEntity } from '../../infrastructure/entities/purchase-return-typeorm.entity';
import { PurchaseReturnLineTypeOrmEntity } from '../../infrastructure/entities/purchase-return-line-typeorm.entity';
import { GL_POSTING_QUEUE_SERVICE } from '../../../finance/application/ports/gl-posting-queue-service.port';
import type { GlPostingQueueServicePort } from '../../../finance/application/ports/gl-posting-queue-service.port';
import { DocumentGenerationHelper } from '../../../shared/infrastructure/document-generation/document-generation.helper';
import { DOCUMENT_TYPES } from '../../../shared/infrastructure/document-generation/document-generation.constants';

@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(GL_POSTING_QUEUE_SERVICE)
    private readonly glPostingQueueService: GlPostingQueueServicePort,
    private readonly docHelper: DocumentGenerationHelper,
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

    const repo = this.dataSource.getRepository(PurchaseReturnTypeOrmEntity);
    const qb = repo.createQueryBuilder('pr');

    if (filters?.search) {
      qb.where(
        '(pr.returnNumber ILIKE :search OR pr.supplierName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.status) {
      qb.andWhere('pr.status = :status', { status: filters.status });
    }

    qb.orderBy('pr.createdAt', 'DESC');
    qb.skip(skip);
    qb.take(limit);

    const [data, total] = await qb.getManyAndCount();

    const dataWithLines = await Promise.all(
      data.map(async (pr) => {
        const lines = await this.dataSource
          .getRepository(PurchaseReturnLineTypeOrmEntity)
          .find({ where: { purchaseReturnId: pr.id } });
        return { ...pr, lines };
      }),
    );

    return { data: dataWithLines, total, page, limit };
  }

  async findById(id: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseReturnTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase return not found');

    const lines = await this.dataSource
      .getRepository(PurchaseReturnLineTypeOrmEntity)
      .find({ where: { purchaseReturnId: id } });

    return { ...pr, lines };
  }

  async create(data: {
    purchaseOrderId?: string;
    supplierId: string;
    supplierName?: string;
    returnDate: string;
    reason?: string;
    lines: {
      itemId?: string;
      itemName: string;
      quantity: number;
      uom?: string;
      unitCost: number;
      reason?: string;
    }[];
  }): Promise<any> {
    if (!data.lines || data.lines.length === 0) {
      throw new BadRequestException(
        'Purchase return must have at least one line',
      );
    }

    const returnNumber = await this.generateReturnNumber();

    const returnRepo = this.dataSource.getRepository(
      PurchaseReturnTypeOrmEntity,
    );
    const lineRepo = this.dataSource.getRepository(
      PurchaseReturnLineTypeOrmEntity,
    );

    const totalAmount = data.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitCost,
      0,
    );

    const purchaseReturn = returnRepo.create({
      returnNumber,
      purchaseOrderId: data.purchaseOrderId,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      returnDate: new Date(data.returnDate),
      status: 'draft',
      totalAmount,
      reason: data.reason,
    });

    const savedReturn = await returnRepo.save(purchaseReturn);

    const lines = await Promise.all(
      data.lines.map((line) => {
        const lineEntity = lineRepo.create({
          purchaseReturnId: savedReturn.id,
          itemId: line.itemId,
          itemName: line.itemName,
          quantity: line.quantity,
          uom: line.uom,
          unitCost: line.unitCost,
          totalCost: line.quantity * line.unitCost,
          reason: line.reason,
        });
        return lineRepo.save(lineEntity);
      }),
    );

    return { ...savedReturn, lines };
  }

  async update(
    id: string,
    data: {
      purchaseOrderId?: string;
      supplierId?: string;
      supplierName?: string;
      returnDate?: string;
      reason?: string;
      lines?: {
        itemId?: string;
        itemName: string;
        quantity: number;
        uom?: string;
        unitCost: number;
        reason?: string;
      }[];
    },
  ): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseReturnTypeOrmEntity);
    const purchaseReturn = await repo.findOne({ where: { id } });
    if (!purchaseReturn)
      throw new NotFoundException('Purchase return not found');
    if (purchaseReturn.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase returns can be updated',
      );
    }

    if (data.purchaseOrderId !== undefined)
      purchaseReturn.purchaseOrderId = data.purchaseOrderId;
    if (data.supplierId !== undefined)
      purchaseReturn.supplierId = data.supplierId;
    if (data.supplierName !== undefined)
      purchaseReturn.supplierName = data.supplierName;
    if (data.returnDate !== undefined)
      purchaseReturn.returnDate = new Date(data.returnDate);
    if (data.reason !== undefined) purchaseReturn.reason = data.reason;

    if (data.lines) {
      const totalAmount = data.lines.reduce(
        (sum, line) => sum + line.quantity * line.unitCost,
        0,
      );
      purchaseReturn.totalAmount = totalAmount;
    }

    await repo.save(purchaseReturn);

    if (data.lines) {
      const lineRepo = this.dataSource.getRepository(
        PurchaseReturnLineTypeOrmEntity,
      );
      await lineRepo.delete({ purchaseReturnId: id });

      await Promise.all(
        data.lines.map((line) => {
          const lineEntity = lineRepo.create({
            purchaseReturnId: id,
            itemId: line.itemId,
            itemName: line.itemName,
            quantity: line.quantity,
            uom: line.uom,
            unitCost: line.unitCost,
            totalCost: line.quantity * line.unitCost,
            reason: line.reason,
          });
          return lineRepo.save(lineEntity);
        }),
      );
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(PurchaseReturnTypeOrmEntity);
    const purchaseReturn = await repo.findOne({ where: { id } });
    if (!purchaseReturn)
      throw new NotFoundException('Purchase return not found');
    if (
      purchaseReturn.status !== 'draft' &&
      purchaseReturn.status !== 'rejected'
    ) {
      throw new BadRequestException(
        'Only draft or rejected purchase returns can be deleted',
      );
    }

    const lineRepo = this.dataSource.getRepository(
      PurchaseReturnLineTypeOrmEntity,
    );
    await lineRepo.delete({ purchaseReturnId: id });
    await repo.remove(purchaseReturn);
  }

  async approve(id: string, approverId: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseReturnTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase return not found');
    if (pr.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase returns can be approved',
      );
    }

    pr.status = 'approved';
    pr.approvedBy = approverId;
    pr.approvedAt = new Date();
    await repo.save(pr);

    void this.docHelper.generateAsync({
      requestId: uuidv4(),
      documentType: DOCUMENT_TYPES.PURCHASE_RETURN,
      entityId: id,
      tenantId: 'default',
      requestedBy: approverId,
      outputFormat: 'pdf',
    });

    // Re-enqueue the GL posting with a clearer approved event so finance
    // can post it as a credit memo.
    if (Number(pr.totalAmount) > 0) {
      const glEntry = await this.glPostingQueueService.createEntry({
        sourceType: 'purchase_return',
        sourceId: pr.id,
        sourceNumber: pr.returnNumber,
        eventType: 'purchase_return_approved',
        amount: Number(pr.totalAmount),
        description: `Purchase Return Approved ${pr.returnNumber}`,
        suggestedLines: [
          {
            accountId: '2100',
            accountCode: '2100',
            accountName: 'Accounts Payable',
            debit: Number(pr.totalAmount),
            credit: 0,
            description: `Debit AP for return ${pr.returnNumber}`,
          },
          {
            accountId: '1300',
            accountCode: '1300',
            accountName: 'Inventory',
            debit: 0,
            credit: Number(pr.totalAmount),
            description: `Reduce inventory for return ${pr.returnNumber}`,
          },
        ],
      });
      await repo.update(pr.id, { glPostingQueueId: glEntry.id });
    }

    return this.findById(id);
  }

  async reject(id: string, approverId: string, reason?: string): Promise<any> {
    const repo = this.dataSource.getRepository(PurchaseReturnTypeOrmEntity);
    const pr = await repo.findOne({ where: { id } });
    if (!pr) throw new NotFoundException('Purchase return not found');
    if (pr.status !== 'draft') {
      throw new BadRequestException(
        'Only draft purchase returns can be rejected',
      );
    }

    pr.status = 'rejected';
    pr.approvedBy = approverId;
    pr.approvedAt = new Date();
    if (reason) {
      pr.reason = pr.reason
        ? `${pr.reason}\nRejection: ${reason}`
        : `Rejection: ${reason}`;
    }
    await repo.save(pr);
    return this.findById(id);
  }

  private async generateReturnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PRTN-${year}-`;
    const repo = this.dataSource.getRepository(PurchaseReturnTypeOrmEntity);

    const result = await repo
      .createQueryBuilder('pr')
      .select('pr.returnNumber', 'returnNumber')
      .where('pr.returnNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('pr.returnNumber', 'DESC')
      .limit(1)
      .getRawOne();

    if (!result?.returnNumber) return `${prefix}0001`;
    const seq = parseInt(result.returnNumber.replace(prefix, ''), 10) + 1;
    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }
}
