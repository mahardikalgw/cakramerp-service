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
import { TestingParameterService } from '../../../application/services/testing-parameter.service';
import {
  CreateTestingParameterHttpDto,
  UpdateTestingParameterHttpDto,
} from '../dtos/testing-parameter.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TestingParameterController {
  constructor(private readonly service: TestingParameterService) {}

  @Get('testing-parameters')
  @RequirePermissions('testing-parameters:read')
  async list(
    @Query('testingServiceId') testingServiceId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const actualLimit = limit || pageSize;
    return this.service.findAll({
      testingServiceId: testingServiceId || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: actualLimit ? parseInt(actualLimit, 10) : undefined,
      search: search || undefined,
    });
  }

  @Get('testing-parameters/by-service/:serviceId')
  @RequirePermissions('testing-parameters:read')
  async listByService(@Param('serviceId') serviceId: string) {
    return this.service.findByTestingServiceId(serviceId);
  }

  @Get('testing-parameters/:id')
  @RequirePermissions('testing-parameters:read')
  async getById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('testing-parameters')
  @RequirePermissions('testing-parameters:create')
  async create(@Body() dto: CreateTestingParameterHttpDto) {
    return this.service.create(dto);
  }

  @Put('testing-parameters/:id')
  @RequirePermissions('testing-parameters:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTestingParameterHttpDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('testing-parameters/:id')
  @RequirePermissions('testing-parameters:delete')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true };
  }
}
