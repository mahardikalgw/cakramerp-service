import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class PostingLineDto {
  @IsString()
  accountId: string;

  @IsNumber()
  debit: number;

  @IsNumber()
  credit: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PostGlToJournalHttpDto {
  @IsString()
  date: string;

  @IsString()
  description: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PostingLineDto)
  lines: PostingLineDto[];
}