import { IsString, MinLength } from 'class-validator';

export class LoginHttpDto {
  /** Email address or username */
  @IsString()
  @MinLength(1)
  identifier: string;

  @IsString()
  password: string;
}
