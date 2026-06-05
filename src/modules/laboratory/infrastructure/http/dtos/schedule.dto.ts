import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateScheduleHttpDto {
  @IsString()
  scheduleDate: string;

  @IsString()
  timeSlot: string;

  @IsUUID()
  laboratoryId: string;

  @IsString()
  laboratoryName: string;

  @IsOptional()
  @IsUUID()
  testingRequestId?: string;

  @IsOptional()
  @IsString()
  testingRequestNumber?: string;

  @IsOptional()
  @IsUUID()
  sampleId?: string;

  @IsOptional()
  @IsString()
  sampleCode?: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateScheduleHttpDto {
  @IsOptional()
  @IsString()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  timeSlot?: string;

  @IsOptional()
  @IsUUID()
  laboratoryId?: string;

  @IsOptional()
  @IsString()
  laboratoryName?: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @IsOptional()
  @IsString()
  technicianName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RescheduleHttpDto {
  @IsString()
  scheduleDate: string;

  @IsString()
  timeSlot: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
