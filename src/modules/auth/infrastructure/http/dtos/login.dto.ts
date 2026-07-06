import { IsString, IsOptional, MinLength, ValidateIf } from 'class-validator';

export class LoginHttpDto {
  /** Email address or username (new field) */
  @IsOptional()
  @IsString()
  @MinLength(1)
  identifier?: string;

  /** Legacy email field — accepted for backward compatibility */
  @IsOptional()
  @IsString()
  @MinLength(1)
  email?: string;

  @IsString()
  password: string;
}
