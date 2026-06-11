import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Closing,
  ClosingChecklistItem,
} from '../../domain/entities/closing.entity';
import type { ClosingRepositoryPort } from '../../domain/repositories/closing-repository.port';
import { CLOSING_REPOSITORY } from '../../domain/repositories/closing-repository.port';
import type { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/lab-contract-repository.port';
import type { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LabActivityLogService } from './lab-activity-log.service';

@Injectable()
export class ClosingService {
  constructor(
    @Inject(CLOSING_REPOSITORY)
    private readonly closingRepo: ClosingRepositoryPort,
    @Inject(LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: LabContractRepositoryPort,
    @Inject(LAB_PURCHASE_ORDER_REPOSITORY)
    private readonly poRepo: LabPurchaseOrderRepositoryPort,
    private readonly activityLog: LabActivityLogService,
  ) {}

  async findAll(options?: {
    entityType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.entityType) filters.entityType = options.entityType;
    if (options?.status) filters.status = options.status;
    return this.closingRepo.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<Closing | null> {
    return this.closingRepo.findById(id);
  }

  async findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Closing | null> {
    return this.closingRepo.findByEntityId(entityType, entityId);
  }

  async initiateClosing(
    entityType: 'contract' | 'purchase_order',
    entityId: string,
    userId: string,
    userName?: string,
  ): Promise<Closing> {
    let entityNumber: string;
    let customerId: string;
    let customerName: string;

    if (entityType === 'contract') {
      const contract = await this.contractRepo.findById(entityId);
      if (!contract) throw new NotFoundException('Contract not found');
      if (contract.status !== 'active')
        throw new BadRequestException('Only active contracts can be closed');
      entityNumber = contract.contractNumber;
      customerId = contract.customerId;
      customerName = contract.customerName;
    } else {
      const po = await this.poRepo.findById(entityId);
      if (!po) throw new NotFoundException('Purchase order not found');
      if (po.status !== 'active')
        throw new BadRequestException(
          'Only active purchase orders can be closed',
        );
      entityNumber = po.poNumber;
      customerId = po.customerId;
      customerName = po.customerName;
    }

    const existing = await this.closingRepo.findByEntityId(
      entityType,
      entityId,
    );
    if (existing)
      throw new BadRequestException(
        'Closing process already exists for this entity',
      );

    const defaultItems = [
      new ClosingChecklistItem({
        closingId: '',
        itemType: 'invoice_paid',
        itemName: 'Invoice fully paid',
      }),
      new ClosingChecklistItem({
        closingId: '',
        itemType: 'certificate_issued',
        itemName: 'Certificate issued',
      }),
      new ClosingChecklistItem({
        closingId: '',
        itemType: 'documentation_completed',
        itemName: 'Documentation completed',
      }),
    ];

    if (entityType === 'contract') {
      defaultItems.push(
        new ClosingChecklistItem({
          closingId: '',
          itemType: 'all_tests_completed',
          itemName: 'All testing activities completed',
        }),
      );
    }

    const closing = new Closing({
      entityType,
      entityId,
      entityNumber,
      customerId,
      customerName,
      status: 'pending',
      items: defaultItems,
    } as any);

    return this.closingRepo.save(closing);
  }

  async completeChecklistItem(
    closingId: string,
    itemIndex: number,
    userId: string,
    notes?: string,
  ): Promise<Closing> {
    const closing = await this.closingRepo.findById(closingId);
    if (!closing) throw new NotFoundException('Closing not found');

    if (!closing.items[itemIndex])
      throw new BadRequestException('Invalid item index');
    closing.items[itemIndex].completed = true;
    closing.items[itemIndex].completedBy = userId;
    closing.items[itemIndex].completedAt = new Date();
    if (notes) closing.items[itemIndex].notes = notes;

    const allCompleted = closing.items.every((item) => item.completed);
    if (allCompleted) closing.status = 'in_progress';

    return this.closingRepo.save(closing);
  }

  async executeClosing(
    closingId: string,
    userId: string,
    userName?: string,
    closingReason?: string,
  ): Promise<Closing> {
    const closing = await this.closingRepo.findById(closingId);
    if (!closing) throw new NotFoundException('Closing not found');

    const allCompleted = closing.items.every((item) => item.completed);
    if (!allCompleted)
      throw new BadRequestException(
        'All checklist items must be completed before closing',
      );

    closing.status = 'completed';
    closing.closedBy = userId;
    closing.closedAt = new Date();
    if (closingReason) closing.closingReason = closingReason;

    const saved = await this.closingRepo.save(closing);

    if (closing.entityType === 'contract') {
      const contract = await this.contractRepo.findById(closing.entityId);
      if (contract) {
        contract.status = 'closed';
        await this.contractRepo.save(contract);
      }
    } else {
      const po = await this.poRepo.findById(closing.entityId);
      if (po) {
        po.status = 'closed';
        await this.poRepo.save(po);
      }
    }

    void this.activityLog.log({
      testingRequestId: closing.entityId,
      action: 'contract_closed',
      performedBy: userId,
      performedByName: userName,
      details: {
        closingId,
        entityType: closing.entityType,
        entityNumber: closing.entityNumber,
      },
    });

    return saved;
  }

  async cancelClosing(closingId: string): Promise<Closing> {
    const closing = await this.closingRepo.findById(closingId);
    if (!closing) throw new NotFoundException('Closing not found');
    if (closing.status === 'completed')
      throw new BadRequestException('Cannot cancel a completed closing');

    closing.status = 'cancelled';
    return this.closingRepo.save(closing);
  }
}
