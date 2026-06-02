import { IsString } from 'class-validator';

export class CreatePermissionHttpDto {
  @IsString()
  name: string;

  @IsString()
  resource: string;

  @IsString()
  action: string;
}
