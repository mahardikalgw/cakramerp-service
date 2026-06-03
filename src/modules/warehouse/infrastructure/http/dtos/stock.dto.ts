import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class GoodsReceiptLineDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreateGoodsReceiptHttpDto {
  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptLineDto)
  lines?: GoodsReceiptLineDto[];
}

class StockIssuanceLineDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateStockIssuanceHttpDto {
  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  destinationType?: string;

  @IsOptional()
  @IsString()
  destinationId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockIssuanceLineDto)
  lines?: StockIssuanceLineDto[];
}

export class ReverseIssuanceHttpDto {
  @IsString()
  reason: string;
}

export class CreateStockOpnameHttpDto {
  @IsString()
  warehouseId: string;
}

export class UpdateOpnameCountsHttpDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpnameLineDto)
  lines: OpnameLineDto[];
}

class OpnameLineDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(0)
  actualQty: number;
}
