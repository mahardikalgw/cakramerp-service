import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesReturnLineDto {
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
  unitPrice: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSalesReturnHttpDto {
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsDateString()
  returnDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesReturnLineDto)
  lines: SalesReturnLineDto[];
}

export class ApproveSalesReturnDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
