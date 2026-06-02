import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateAccountHttpDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
  type: string;

  @IsOptional()
  @IsString()
  taxCategory?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateAccountHttpDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
  type?: string;

  @IsOptional()
  @IsString()
  taxCategory?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
