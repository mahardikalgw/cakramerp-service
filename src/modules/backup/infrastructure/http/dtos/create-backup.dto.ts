import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateBackupHttpDto {
  @IsString()
  name: string;

  @IsString()
  schedule: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  retentionDays?: number;
}
