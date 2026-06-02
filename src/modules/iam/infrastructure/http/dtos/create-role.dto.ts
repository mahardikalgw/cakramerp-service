import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateRoleHttpDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
