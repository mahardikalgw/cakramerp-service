import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsNumber,
  IsIn,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TestingRequestLineDto {
  @IsUUID()
  testingServiceId: string;

  @IsString()
  serviceName: string;

  @IsOptional()
  @IsString()
  sampleCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sampleQuantity?: number;

  @IsOptional()
  @IsString()
  sampleNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTestingRequestHttpDto {
  @IsUUID()
  customerId: string;

  @IsString()
  projectName: string;

  @IsOptional()
  @IsString()
  projectLocation?: string;

  @IsOptional()
  @IsString()
  projectAddress?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sampleQuantity?: number;

  @IsOptional()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsString()
  billingType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['normal', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  scopeOfTesting?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  contractEstimation?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  contractTempoDays?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  scopeOfTestingServiceIds?: string[];

  @IsOptional()
  @IsUUID()
  existingContractId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestingRequestLineDto)
  lines: TestingRequestLineDto[];
}

export class UpdateTestingRequestHttpDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  projectLocation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sampleQuantity?: number;

  @IsOptional()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestingRequestLineDto)
  lines?: TestingRequestLineDto[];
}

export class ApproveRejectDto {
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPaymentAmount?: number;
}

export class AssignLaboranDto {
  @IsUUID()
  laboranId: string;

  @IsString()
  laboranName: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UploadDocumentDto {
  @IsString()
  fileUrl: string;

  @IsString()
  fileName: string;
}
