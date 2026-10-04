import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DOCUMENT_GENERATION_QUEUE_NAME } from './queue.constants';
import {
  DocumentGenerationService,
  type DocumentGenerationJobData,
} from '../modules/shared/infrastructure/document-generation/application/document-generation.service';

@Processor(DOCUMENT_GENERATION_QUEUE_NAME)
export class DocumentGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentGenerationProcessor.name);

  constructor(private readonly service: DocumentGenerationService) {
    super();
  }

  async process(job: { data: DocumentGenerationJobData }): Promise<void> {
    this.logger.debug(
      `Processing document generation ${job.data.documentType} (${job.data.documentRecordId})`,
    );
    await this.service.process(job.data);
  }
}
