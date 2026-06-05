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
import { LaboratoryService } from '../../../application/services/laboratory.service';
import {
  CreateLaboratoryHttpDto,
  UpdateLaboratoryHttpDto,
} from '../dtos/laboratory.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LaboratoryController {
  constructor(private readonly laboratoryService: LaboratoryService) {}

  @Get('laboratories')
  @RequirePermissions('laboratories:read')
  async listLaboratories(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.laboratoryService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('laboratories/:id')
  @RequirePermissions('laboratories:read')
  async getLaboratory(@Param('id') id: string) {
    return this.laboratoryService.findById(id);
  }

  @Post('laboratories')
  @RequirePermissions('laboratories:create')
  async createLaboratory(@Body() dto: CreateLaboratoryHttpDto) {
    return this.laboratoryService.create(dto);
  }

  @Put('laboratories/:id')
  @RequirePermissions('laboratories:update')
  async updateLaboratory(
    @Param('id') id: string,
    @Body() dto: UpdateLaboratoryHttpDto,
  ) {
    return this.laboratoryService.update(id, dto);
  }

  @Delete('laboratories/:id')
  @RequirePermissions('laboratories:delete')
  async deleteLaboratory(@Param('id') id: string) {
    await this.laboratoryService.delete(id);
    return { success: true };
  }
}
