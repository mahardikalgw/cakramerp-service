import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class BankStatementLineDto {
  @IsString()
  date: string;

  @IsString()
  description: string;

  @IsNumber()
  debit: number;

  @IsNumber()
  credit: number;

  @IsNumber()
  balance: number;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class ImportBankStatementHttpDto {
  @IsString()
  bankAccountId: string;

  @IsString()
  periodStart: string;

  @IsString()
  periodEnd: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankStatementLineDto)
  lines: BankStatementLineDto[];
}

export class ManualMatchHttpDto {
  @IsString()
  bankStatementLineId: string;

  @IsString()
  journalLineId: string;
}