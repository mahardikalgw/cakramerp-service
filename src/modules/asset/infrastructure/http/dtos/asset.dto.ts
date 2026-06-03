import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateAssetHttpDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsDateString()
  acquisitionDate: string;

  @IsNumber()
  @Min(0)
  acquisitionCost: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @IsNumber()
  @Min(1)
  usefulLifeMonths: number;

  @IsIn(['straight_line', 'declining_balance', 'unit_production'])
  depreciationMethod: string;

  @IsOptional()
  @IsNumber()
  decliningBalanceRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalEstimatedUnits?: number;

  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  depreciationSchedule?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  assignedToEmployeeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAssetHttpDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salvageValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usefulLifeMonths?: number;

  @IsOptional()
  @IsIn(['straight_line', 'declining_balance', 'unit_production'])
  depreciationMethod?: string;

  @IsOptional()
  @IsNumber()
  decliningBalanceRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalEstimatedUnits?: number;

  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'yearly'])
  depreciationSchedule?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'fully_depreciated', 'disposed'])
  status?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  assignedToEmployeeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CalculateDepreciationHttpDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitsProduced?: number;
}
