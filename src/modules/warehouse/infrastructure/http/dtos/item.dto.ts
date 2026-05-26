import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateItemHttpDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  uom: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}

export class UpdateItemHttpDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}