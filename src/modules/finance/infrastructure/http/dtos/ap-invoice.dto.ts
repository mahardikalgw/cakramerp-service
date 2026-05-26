import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class APInvoiceLineDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateAPInvoiceHttpDto {
  @IsString()
  vendorId: string;

  @IsString()
  vendorName: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierInvoiceNumber?: string;

  @IsOptional()
  @IsString()
  poReferenceId?: string;

  @IsOptional()
  @IsString()
  grnReferenceId?: string;

  @IsString()
  invoiceDate: string;

  @IsString()
  dueDate: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  paymentTermDays?: number;

  @IsOptional()
  @IsString()
  paymentTermLabel?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalDiscount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => APInvoiceLineDto)
  lines?: APInvoiceLineDto[];
}

export class SchedulePaymentHttpDto {
  @IsString()
  dueDate: string;

  @IsString()
  bankAccountId: string;
}

export class BulkPaymentHttpDto {
  @IsArray()
  @IsString({ each: true })
  invoiceIds: string[];

  @IsString()
  bankAccountId: string;

  @IsString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  reference?: string;
}