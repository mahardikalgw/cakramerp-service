import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateWarehouseHttpDto {
  @IsString()
  name: string;

  @IsString()
  location: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWarehouseHttpDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
