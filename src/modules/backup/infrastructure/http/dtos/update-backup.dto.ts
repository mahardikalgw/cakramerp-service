import { IsString, IsOptional, IsNumber, IsIn, Min } from 'class-validator';

export class UpdateBackupHttpDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsIn(['active', 'paused', 'disabled'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  retentionDays?: number;
}