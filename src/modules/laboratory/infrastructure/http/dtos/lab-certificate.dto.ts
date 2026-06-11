import { IsString, IsOptional, IsUUID } from 'class-validator';

export class GenerateCertificateHttpDto {
  @IsUUID()
  testingRequestId: string;
}

export class RevokeCertificateHttpDto {
  @IsString()
  reason: string;
}
