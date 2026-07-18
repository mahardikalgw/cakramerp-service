import { IsNumber, IsOptional, Min } from 'class-validator';

export class ApproveTestingRequestDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  downPaymentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercent?: number;
}
