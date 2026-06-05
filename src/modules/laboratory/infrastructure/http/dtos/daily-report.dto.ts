import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

export class CreateDailyReportHttpDto {
  @IsString()
  reportDate: string;

  @IsUUID()
  testingRequestId: string;

  @IsString()
  testingRequestNumber: string;

  @IsUUID()
  customerId: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  testResultIds?: string[];
}

export class RevisionRequestDto {
  @IsString()
  rejectionReason: string;
}
