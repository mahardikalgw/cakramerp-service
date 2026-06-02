import { IsString, MinLength } from 'class-validator';

export class ChangePasswordHttpDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  password: string;
}
