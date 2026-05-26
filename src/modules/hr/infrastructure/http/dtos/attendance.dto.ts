import { IsString, IsOptional, IsIn } from 'class-validator';

export class RecordAttendanceHttpDto {
  @IsString()
  employeeId: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  clockIn?: string;

  @IsOptional()
  @IsString()
  clockOut?: string;

  @IsOptional()
  @IsIn(['present', 'absent', 'late', 'half_day', 'sick', 'leave'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportAttendanceHttpDto {
  lines: any[];
}