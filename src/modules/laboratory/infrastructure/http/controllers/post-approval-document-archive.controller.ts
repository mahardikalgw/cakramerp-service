import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { PostApprovalDocumentArchiveService } from '../../../application/services/post-approval-document-archive.service';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostApprovalDocumentArchiveController {
  constructor(private readonly service: PostApprovalDocumentArchiveService) {}

  @Get('post-approval/archives')
  @RequirePermissions('archives:read')
  async findAll(
    @Query('documentType') documentType?: string,
    @Query('contractId') contractId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      documentType,
      contractId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('post-approval/archives/:id')
  @RequirePermissions('archives:read')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('post-approval/archives')
  @RequirePermissions('archives:create')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async uploadSignedDocument(
    @Body('testingResultId') testingResultId: string | undefined,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const user = req.user ?? {};
    const userName =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'System';
    return this.service.uploadSignedDocument(
      testingResultId ?? '',
      file,
      user.id ?? 'unknown',
      userName,
    );
  }

  @Get('post-approval/archives/:id/download')
  @RequirePermissions('archives:read')
  async getDownloadUrl(@Param('id') id: string) {
    return this.service.getDownloadUrl(id);
  }
}
