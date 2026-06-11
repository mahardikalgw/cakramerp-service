import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateVerificationHttpDto {
  @IsString()
  entityType: 'contract' | 'purchase_order';

  @IsUUID()
  entityId: string;
}

export class VerifyChecklistItemHttpDto {
  @IsNumber()
  itemIndex: number;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectVerificationHttpDto {
  @IsString()
  rejectionReason: string;
}
