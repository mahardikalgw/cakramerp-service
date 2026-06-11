import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Verification,
  VerificationChecklistItem,
} from '../../domain/entities/verification.entity';
import type { VerificationRepositoryPort } from '../../domain/repositories/verification-repository.port';
import { VERIFICATION_REPOSITORY } from '../../domain/repositories/verification-repository.port';
import type { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/lab-contract-repository.port';
import type { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LabActivityLogService } from './lab-activity-log.service';

@Injectable()
export class VerificationService {
  constructor(
    @Inject(VERIFICATION_REPOSITORY)
    private readonly verificationRepo: VerificationRepositoryPort,
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
    return this.verificationRepo.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<Verification | null> {
    return this.verificationRepo.findById(id);
  }

  async findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<Verification | null> {
    return this.verificationRepo.findByEntityId(entityType, entityId);
  }

  async createVerification(
    entityType: 'contract' | 'purchase_order',
    entityId: string,
    userId: string,
    userName?: string,
  ): Promise<Verification> {
    let entityNumber: string;
    let customerId: string;
    let customerName: string;

    if (entityType === 'contract') {
      const contract = await this.contractRepo.findById(entityId);
      if (!contract) throw new NotFoundException('Contract not found');
      if (contract.status !== 'signed')
        throw new BadRequestException('Only signed contracts can be verified');
      entityNumber = contract.contractNumber;
      customerId = contract.customerId;
      customerName = contract.customerName;
    } else {
      const po = await this.poRepo.findById(entityId);
      if (!po) throw new NotFoundException('Purchase order not found');
      if (po.status !== 'signed')
        throw new BadRequestException(
          'Only signed purchase orders can be verified',
        );
      entityNumber = po.poNumber;
      customerId = po.customerId;
      customerName = po.customerName;
    }

    const existing = await this.verificationRepo.findByEntityId(
      entityType,
      entityId,
    );
    if (existing)
      throw new BadRequestException(
        'Verification already exists for this entity',
      );

    const defaultItems: VerificationChecklistItem[] =
      entityType === 'contract'
        ? [
            new VerificationChecklistItem({
              verificationId: '',
              itemType: 'contract',
              itemName: 'Contract document verified',
            }),
            new VerificationChecklistItem({
              verificationId: '',
              itemType: 'payment',
              itemName: 'Payment verified',
            }),
            new VerificationChecklistItem({
              verificationId: '',
              itemType: 'supporting_document',
              itemName: 'Supporting documents verified',
            }),
          ]
        : [
            new VerificationChecklistItem({
              verificationId: '',
              itemType: 'purchase_order',
              itemName: 'Purchase order document verified',
            }),
            new VerificationChecklistItem({
              verificationId: '',
              itemType: 'payment',
              itemName: 'Payment verified',
            }),
            new VerificationChecklistItem({
              verificationId: '',
              itemType: 'supporting_document',
              itemName: 'Supporting documents verified',
            }),
          ];

    const verification = new Verification({
      entityType,
      entityId,
      entityNumber,
      customerId,
      customerName,
      status: 'pending',
      items: defaultItems,
    } as any);

    const saved = await this.verificationRepo.save(verification);
    return saved;
  }

  async verifyItem(
    verificationId: string,
    itemIndex: number,
    userId: string,
    documentUrl?: string,
    notes?: string,
  ): Promise<Verification> {
    const verification = await this.verificationRepo.findById(verificationId);
    if (!verification) throw new NotFoundException('Verification not found');

    if (!verification.items[itemIndex])
      throw new BadRequestException('Invalid item index');
    verification.items[itemIndex].verified = true;
    verification.items[itemIndex].verifiedBy = userId;
    verification.items[itemIndex].verifiedAt = new Date();
    if (documentUrl) verification.items[itemIndex].documentUrl = documentUrl;
    if (notes) verification.items[itemIndex].notes = notes;

    return this.verificationRepo.save(verification);
  }

  async verifyAndActivate(
    verificationId: string,
    userId: string,
    userName?: string,
  ): Promise<Verification> {
    const verification = await this.verificationRepo.findById(verificationId);
    if (!verification) throw new NotFoundException('Verification not found');

    const allVerified = verification.items.every((item) => item.verified);
    if (!allVerified)
      throw new BadRequestException(
        'All checklist items must be verified before activation',
      );

    verification.status = 'verified';
    verification.verifiedBy = userId;
    verification.verifiedAt = new Date();
    verification.activatedAt = new Date();

    const saved = await this.verificationRepo.save(verification);

    if (verification.entityType === 'contract') {
      const contract = await this.contractRepo.findById(verification.entityId);
      if (contract) {
        contract.status = 'active';
        await this.contractRepo.save(contract);
      }
    } else {
      const po = await this.poRepo.findById(verification.entityId);
      if (po) {
        po.status = 'active';
        await this.poRepo.save(po);
      }
    }

    void this.activityLog.log({
      testingRequestId: verification.entityId,
      action: 'verification_completed',
      performedBy: userId,
      performedByName: userName,
      details: {
        verificationId,
        entityType: verification.entityType,
        entityNumber: verification.entityNumber,
      },
    });

    return saved;
  }

  async rejectVerification(
    verificationId: string,
    userId: string,
    rejectionReason: string,
  ): Promise<Verification> {
    const verification = await this.verificationRepo.findById(verificationId);
    if (!verification) throw new NotFoundException('Verification not found');

    verification.status = 'rejected';
    verification.rejectionReason = rejectionReason;
    return this.verificationRepo.save(verification);
  }
}
