import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsIn,
  IsUUID,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateEmployeeHttpDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  workStartTime?: string;

  @IsOptional()
  @IsString()
  workEndTime?: string;

  @IsOptional()
  @IsNumber()
  breakDurationMinutes?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers and underscores',
  })
  username?: string;
}

export class UpdateEmployeeHttpDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsString()
  hireDate?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'terminated'])
  status?: string;

  @IsOptional()
  @IsString()
  workStartTime?: string;

  @IsOptional()
  @IsString()
  workEndTime?: string;

  @IsOptional()
  @IsNumber()
  breakDurationMinutes?: number;
}
