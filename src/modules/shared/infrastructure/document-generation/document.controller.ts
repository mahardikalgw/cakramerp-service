import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentGenerationHelper } from './document-generation.helper';
import { MinioClientService } from './minio-client.service';
import { GeneratedDocumentTypeOrmEntity } from './entities/generated-document.entity';
import type { DocumentGenerationRequest } from './dto/document-generation.dto';
import type { DocumentType } from './document-generation.constants';

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly docHelper: DocumentGenerationHelper,
    private readonly minioClient: MinioClientService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async getDocument(
    @Param('id') id: string,
  ): Promise<GeneratedDocumentTypeOrmEntity> {
    return this.docHelper.getDocument(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document file directly' })
  async downloadDocument(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const doc = await this.docHelper.getDocument(id);
    if (!doc?.minioPath || !doc?.minioBucket) {
      throw new NotFoundException('Document file not available');
    }

    const objectName = doc.minioPath.replace(`${doc.minioBucket}/`, '');
    const stream = await this.minioClient.getObjectStream(
      doc.minioBucket,
      objectName,
    );

    const contentType = doc.contentType || 'application/octet-stream';
    const filename = encodeURIComponent(doc.fileName || `document-${id}`);

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${filename}"; filename*=UTF-8''${filename}`,
    );

    stream.pipe(res);
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
