import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { GeneratedDocumentTypeOrmEntity } from './entities/generated-document.entity';
import { MinioClientService } from './minio-client.service';
import { DocumentGenerationHelper } from './document-generation.helper';
import { DocumentController } from './document.controller';
import { PdfmakeAdapter } from './infrastructure/pdf/pdfmake.adapter';
import { ExcelJsAdapter } from './infrastructure/xlsx/exceljs.adapter';
import { DocumentStorageService } from './infrastructure/storage/document-storage.service';
import { PayloadDocumentRenderer } from './infrastructure/strategies/payload.document-renderer';
import { SqlDataDocumentRenderer } from './infrastructure/strategies/sql-data.document-renderer';
import { DocumentRendererRegistry } from './application/document-renderer.registry';
import { DocumentGenerationService } from './application/document-generation.service';
import { DOCUMENT_GENERATION_QUEUE_NAME } from '../../../../queues/queue.constants';
import { DocumentGenerationProcessor } from '../../../../queues/document-generation.processor';
import { ScheduleReportBuilder } from './reports/schedule-report.builder';
import { ContractTotalReportBuilder } from './reports/contract-total-report.builder';
import { SampleReportBuilder } from './reports/sample-report.builder';

/**
 * In-house document generation module. Fully replaces the former HTTP client
 * to the external `cakramerp-document` service.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([GeneratedDocumentTypeOrmEntity]),
    BullModule.registerQueue({ name: DOCUMENT_GENERATION_QUEUE_NAME }),
  ],
  controllers: [DocumentController],
  providers: [
    MinioClientService,
    PdfmakeAdapter,
    ExcelJsAdapter,
    DocumentStorageService,
    PayloadDocumentRenderer,
    SqlDataDocumentRenderer,
    DocumentRendererRegistry,
    DocumentGenerationService,
    DocumentGenerationHelper,
    DocumentGenerationProcessor,
    ScheduleReportBuilder,
    ContractTotalReportBuilder,
    SampleReportBuilder,
  ],
  exports: [
    MinioClientService,
    DocumentGenerationService,
    DocumentGenerationHelper,
    ScheduleReportBuilder,
    ContractTotalReportBuilder,
    SampleReportBuilder,
  ],
})
export class DocumentGenerationModule {}
