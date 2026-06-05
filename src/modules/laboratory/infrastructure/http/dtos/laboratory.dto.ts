import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateLaboratoryHttpDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;
}

export class UpdateLaboratoryHttpDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  isActive?: boolean;
}
