import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard'
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator'
import { CUSTOMER_SERVICE } from '../../../application/ports/customer-service.port'
import type {
  CustomerServicePort,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../../../application/ports/customer-service.port'

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerController {
  constructor(
    @Inject(CUSTOMER_SERVICE)
    private readonly customerService: CustomerServicePort,
  ) {}

  @Get()
  @RequirePermissions('customers:read')
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  async findById(@Param('id') id: string) {
    return this.customerService.findById(id)
  }

  @Post()
  @RequirePermissions('customers:create')
  async create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto)
  }

  @Patch(':id')
  @RequirePermissions('customers:update')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions('customers:delete')
  async delete(@Param('id') id: string) {
    return this.customerService.delete(id)
  }
}
