import { IsString, IsEmail } from 'class-validator';

export class LoginHttpDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}