import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
} from 'class-validator';

export class DistributeReportHttpDto {
  @IsString()
  documentType: string;

  @IsUUID()
  documentId: string;

  @IsString()
  documentNumber: string;

  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;
}

export class ArchiveDocumentHttpDto {
  @IsString()
  documentType: string;

  @IsUUID()
  entityId: string;

  @IsString()
  documentNumber: string;

  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}
