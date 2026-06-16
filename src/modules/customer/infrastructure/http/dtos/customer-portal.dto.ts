import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsIn,
  IsUUID,
} from 'class-validator';

export class UploadPortalDocumentDto {
  @IsString()
  fileUrl: string;

  @IsString()
  fileName: string;
}
import { Type } from 'class-transformer';

export class CustomerRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  taxId?: string;
}

export class CustomerLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class UpdatePortalProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;
}

// ---- Portal Lab Request DTOs ----

export class PortalTestingRequestLineDto {
  @IsUUID()
  testingServiceId: string;

  @IsString()
  serviceName: string;

  @IsOptional()
  @IsString()
  sampleCode?: string;

  @IsOptional()
  @IsString()
  sampleDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sampleQuantity?: number;

  @IsOptional()
  @IsString()
  sampleNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePortalTestingRequestDto {
  @IsIn(['contract', 'cash'])
  billingType: 'contract' | 'cash';

  @IsOptional()
  @IsUUID()
  labContractId?: string;

  @IsOptional()
  @IsUUID()
  existingContractId?: string;

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
  contractTempoMonths?: number;

  @IsString()
  projectName: string;

  @IsOptional()
  @IsString()
  projectLocation?: string;

  @IsOptional()
  @IsString()
  projectAddress?: string;

  @IsOptional()
  @IsString()
  testingType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sampleQuantity?: number;

  @IsOptional()
  @IsIn(['normal', 'urgent'])
  priority?: 'normal' | 'urgent';

  /** General request notes */
  @IsOptional()
  @IsString()
  notes?: string;

  /** Additional notes (optional) */
  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortalTestingRequestLineDto)
  lines?: PortalTestingRequestLineDto[];
}

export class UpdatePortalTestingRequestDto {
  @IsOptional()
  @IsString()
  projectName?: string;

  @IsOptional()
  @IsString()
  projectLocation?: string;

  @IsOptional()
  @IsString()
  testingType?: string;

  @IsOptional()
  @IsIn(['normal', 'urgent'])
  priority?: 'normal' | 'urgent';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  additionalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortalTestingRequestLineDto)
  lines?: PortalTestingRequestLineDto[];
}
