import { IsString, IsOptional } from 'class-validator';

export class UploadContractAttachmentHttpDto {
  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileType?: string;
}
