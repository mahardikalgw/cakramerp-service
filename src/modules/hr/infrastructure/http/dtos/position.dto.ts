import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator'

export class CreatePositionHttpDto {
  @IsString()
  name: string

  @IsOptional()
  @IsUUID()
  departmentId?: string

  @IsOptional()
  @IsString()
  description?: string
}

export class UpdatePositionHttpDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsUUID()
  departmentId?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
