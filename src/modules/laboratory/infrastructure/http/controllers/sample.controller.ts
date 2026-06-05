import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { SampleService } from '../../../application/services/sample.service';
import {
  CreateSampleHttpDto,
  UpdateSampleHttpDto,
} from '../../http/dtos/sample.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SampleController {
  constructor(private readonly sampleService: SampleService) {}

  @Get('samples')
  @RequirePermissions('samples:read')
  async listSamples(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('testingRequestId') testingRequestId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sampleService.findAll({
      status,
      customerId,
      testingRequestId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('samples/:id')
  @RequirePermissions('samples:read')
  async getSample(@Param('id') id: string) {
    return this.sampleService.findById(id);
  }

  @Post('samples')
  @RequirePermissions('samples:create')
  async createSample(@Body() dto: CreateSampleHttpDto) {
    return this.sampleService.create(dto);
  }

  @Put('samples/:id')
  @RequirePermissions('samples:update')
  async updateSample(
    @Param('id') id: string,
    @Body() dto: UpdateSampleHttpDto,
  ) {
    return this.sampleService.update(id, dto);
  }

  @Patch('samples/:id/receive')
  @RequirePermissions('samples:update')
  async receiveSample(@Param('id') id: string, @Req() req: any) {
    return this.sampleService.receive(id, req.user?.id ?? 'unknown');
  }

  @Patch('samples/:id/start-processing')
  @RequirePermissions('samples:update')
  async startProcessing(@Param('id') id: string) {
    return this.sampleService.startProcessing(id);
  }

  @Patch('samples/:id/complete')
  @RequirePermissions('samples:update')
  async completeSample(@Param('id') id: string) {
    return this.sampleService.complete(id);
  }

  @Delete('samples/:id')
  @RequirePermissions('samples:delete')
  async deleteSample(@Param('id') id: string) {
    await this.sampleService.delete(id);
    return { success: true };
  }
}
