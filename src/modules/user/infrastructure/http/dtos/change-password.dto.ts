import { IsString, MinLength } from 'class-validator';

export class ChangePasswordHttpDto {
  @IsString()
  @MinLength(8)
  password: string;
}
