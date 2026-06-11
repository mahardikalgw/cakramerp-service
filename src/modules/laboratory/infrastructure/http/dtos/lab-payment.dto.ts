import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreatePaymentMethodHttpDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountHolder?: string;

  @IsOptional()
  @IsString()
  virtualAccountPattern?: string;
}

export class UploadPaymentEvidenceHttpDto {
  @IsOptional()
  @IsUUID()
  labPurchaseOrderId?: string;

  @IsOptional()
  @IsUUID()
  labContractId?: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileType?: string;
}

export class RejectPaymentEvidenceHttpDto {
  @IsString()
  reason: string;
}
