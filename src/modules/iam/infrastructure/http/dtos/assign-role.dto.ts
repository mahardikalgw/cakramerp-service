import { IsString, IsArray } from 'class-validator';

export class AssignRoleHttpDto {
  @IsString()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}