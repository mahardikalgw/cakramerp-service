import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ApplyLeaveHttpDto {
  @IsString()
  leaveTypeId: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @IsOptional()
  @IsString()
  attachmentPath?: string;
}

export class UpdateProfileHttpDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;
}

export class CreateChangeRequestHttpDto {
  @IsString()
  fieldName: string;

  @IsString()
  oldValue: string;

  @IsString()
  newValue: string;

  @IsString()
  reason: string;
}

export class FlagDiscrepancyHttpDto {
  @IsString()
  date: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  correctClockIn?: string;

  @IsOptional()
  @IsString()
  correctClockOut?: string;
}

export class CreateOvertimeRequestHttpDto {
  @IsString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  projectReference?: string;
}