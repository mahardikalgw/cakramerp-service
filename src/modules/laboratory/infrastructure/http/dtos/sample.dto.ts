import { IsString, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class CreateSampleHttpDto {
  @IsUUID()
  sampleTypeId: string;

  @IsString()
  sampleTypeName: string;

  @IsOptional()
  @IsUUID()
  testingRequestId?: string;

  @IsOptional()
  @IsString()
  testingRequestNumber?: string;

  @IsUUID()
  customerId: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSampleHttpDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
