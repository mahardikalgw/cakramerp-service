import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentGenerationHelper } from './document-generation.helper';
import { GeneratedDocumentTypeOrmEntity } from './entities/generated-document.entity';
import type { DocumentGenerationRequest } from './dto/document-generation.dto';
import type { DocumentType } from './document-generation.constants';

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly docHelper: DocumentGenerationHelper) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async getDocument(
    @Param('id') id: string,
  ): Promise<GeneratedDocumentTypeOrmEntity> {
    return this.docHelper.getDocument(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get presigned download URL for document' })
  async downloadDocument(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.docHelper.getDownloadUrl(id);
    return { url };
  }

  @Get('entity/:documentType/:entityId')
  @ApiOperation({ summary: 'Get documents by entity type and ID' })
  async getDocumentsByEntity(
    @Param('documentType') documentType: DocumentType,
    @Param('entityId') entityId: string,
  ): Promise<GeneratedDocumentTypeOrmEntity[]> {
    return this.docHelper.getDocumentsByEntity(documentType, entityId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Request document generation' })
  async generateDocument(
    @Body() request: DocumentGenerationRequest,
  ): Promise<{ requestId: string; status: string }> {
    const doc = await this.docHelper.generateAsync(request);
    return { requestId: doc.id, status: doc.status };
  }
}
