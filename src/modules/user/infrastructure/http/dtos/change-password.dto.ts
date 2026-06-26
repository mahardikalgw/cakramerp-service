import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordHttpDto {
  @IsOptional()
  @IsString()
  oldPassword?: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class ForceSetPasswordHttpDto {
  @IsString()
  @MinLength(8)
  password: string;
}
