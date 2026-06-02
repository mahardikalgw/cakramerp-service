import { IsOptional, IsObject } from 'class-validator';

export class UpdateSettingsHttpDto {
  @IsOptional()
  @IsObject()
  companyProfile?: Record<string, string>;

  @IsOptional()
  @IsObject()
  systemSettings?: Record<string, string>;
}
