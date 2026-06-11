import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneratedDocumentTypeOrmEntity } from './entities/generated-document.entity';
import { MinioClientService } from './minio-client.service';
import { DocumentGenerationRestClient } from './document-generation-rest-client.service';
import { DocumentGenerationHelper } from './document-generation.helper';
import { DocumentController } from './document.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([GeneratedDocumentTypeOrmEntity])],
  controllers: [DocumentController],
  providers: [
    MinioClientService,
    DocumentGenerationRestClient,
    DocumentGenerationHelper,
  ],
  exports: [
    MinioClientService,
    DocumentGenerationRestClient,
    DocumentGenerationHelper,
  ],
})
export class DocumentGenerationModule {}
