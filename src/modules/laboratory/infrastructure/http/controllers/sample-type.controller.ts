import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { SampleTypeService } from '../../../application/services/sample-type.service';
import {
  CreateSampleTypeHttpDto,
  UpdateSampleTypeHttpDto,
} from '../dtos/sample-type.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SampleTypeController {
  constructor(private readonly sampleTypeService: SampleTypeService) {}

  @Get('sample-types')
  @RequirePermissions('sample-types:read')
  async listSampleTypes(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sampleTypeService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('sample-types/:id')
  @RequirePermissions('sample-types:read')
  async getSampleType(@Param('id') id: string) {
    return this.sampleTypeService.findById(id);
  }

  @Post('sample-types')
  @RequirePermissions('sample-types:create')
  async createSampleType(@Body() dto: CreateSampleTypeHttpDto) {
    return this.sampleTypeService.create(dto);
  }

  @Put('sample-types/:id')
  @RequirePermissions('sample-types:update')
  async updateSampleType(
    @Param('id') id: string,
    @Body() dto: UpdateSampleTypeHttpDto,
  ) {
    return this.sampleTypeService.update(id, dto);
  }

  @Delete('sample-types/:id')
  @RequirePermissions('sample-types:delete')
  async deleteSampleType(@Param('id') id: string) {
    await this.sampleTypeService.delete(id);
    return { success: true };
  }
}
