import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTestingParameterHttpDto {
  @IsString()
  @IsNotEmpty()
  testingServiceId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  standard?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTestingParameterHttpDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  standard?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
