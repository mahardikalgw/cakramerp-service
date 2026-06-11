import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateClosingHttpDto {
  @IsString()
  entityType: 'contract' | 'purchase_order';

  @IsUUID()
  entityId: string;
}

export class CompleteChecklistItemHttpDto {
  @IsNumber()
  itemIndex: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExecuteClosingHttpDto {
  @IsOptional()
  @IsString()
  closingReason?: string;
}
