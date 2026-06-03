import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseReturnLineDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  itemName: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreatePurchaseReturnHttpDto {
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsString()
  supplierId: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsDateString()
  returnDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnLineDto)
  lines: PurchaseReturnLineDto[];
}

export class ApproveReturnDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
