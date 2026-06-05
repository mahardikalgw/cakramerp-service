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
import { TestingServiceService } from '../../../application/services/testing-service.service';
import {
  CreateTestingServiceHttpDto,
  UpdateTestingServiceHttpDto,
} from '../dtos/testing-service.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TestingServiceController {
  constructor(private readonly testingServiceService: TestingServiceService) {}

  @Get('testing-services')
  @RequirePermissions('testing-services:read')
  async listTestingServices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.testingServiceService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('testing-services/:id')
  @RequirePermissions('testing-services:read')
  async getTestingService(@Param('id') id: string) {
    return this.testingServiceService.findById(id);
  }

  @Post('testing-services')
  @RequirePermissions('testing-services:create')
  async createTestingService(@Body() dto: CreateTestingServiceHttpDto) {
    return this.testingServiceService.create(dto);
  }

  @Put('testing-services/:id')
  @RequirePermissions('testing-services:update')
  async updateTestingService(
    @Param('id') id: string,
    @Body() dto: UpdateTestingServiceHttpDto,
  ) {
    return this.testingServiceService.update(id, dto);
  }

  @Delete('testing-services/:id')
  @RequirePermissions('testing-services:delete')
  async deleteTestingService(@Param('id') id: string) {
    await this.testingServiceService.delete(id);
    return { success: true };
  }
}
