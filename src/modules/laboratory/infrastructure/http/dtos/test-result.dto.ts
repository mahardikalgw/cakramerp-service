import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TestResultAttachmentDto {
  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileType?: string;
}

export class CreateTestResultHttpDto {
  @IsUUID()
  sampleId: string;

  @IsString()
  sampleCode: string;

  @IsUUID()
  testingServiceId: string;

  @IsString()
  serviceName: string;

  @IsOptional()
  @IsUUID()
  testingRequestId?: string;

  @IsString()
  parameter: string;

  @IsString()
  resultValue: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  laboratoryNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestResultAttachmentDto)
  attachments?: TestResultAttachmentDto[];
}

export class UpdateTestResultHttpDto {
  @IsOptional()
  @IsString()
  parameter?: string;

  @IsOptional()
  @IsString()
  resultValue?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  laboratoryNotes?: string;
}
