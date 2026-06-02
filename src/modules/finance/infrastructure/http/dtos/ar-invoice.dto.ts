import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class ARInvoiceLineDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  taxPercent: number;
}

export class CreateARInvoiceHttpDto {
  @IsString()
  clientId: string;

  @IsString()
  clientName: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  invoiceDate: string;

  @IsString()
  dueDate: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ARInvoiceLineDto)
  lines: ARInvoiceLineDto[];

  @IsOptional()
  @IsBoolean()
  asDraft?: boolean;
}

export class UpdateARInvoiceHttpDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

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
  @Type(() => ARInvoiceLineDto)
  lines?: ARInvoiceLineDto[];
}

export class RecordPaymentHttpDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  paymentDate: string;

  @IsString()
  bankAccountId: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
