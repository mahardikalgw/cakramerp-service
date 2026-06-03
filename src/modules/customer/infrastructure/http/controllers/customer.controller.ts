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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { CUSTOMER_SERVICE } from '../../../application/ports/customer-service.port';
import type { CustomerServicePort } from '../../../application/ports/customer-service.port';
import { CreateCustomerCommand } from '../../../application/commands/create-customer.command';
import { UpdateCustomerCommand } from '../../../application/commands/update-customer.command';
import { CreateCustomerHttpDto } from '../dtos/create-customer.dto';
import { UpdateCustomerHttpDto } from '../dtos/update-customer.dto';
import { CustomerResponseDto } from '../dtos/customer-response.dto';

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
    const result = await this.customerService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      data: result.data.map((c) => CustomerResponseDto.fromDomain(c)),
      total: result.total,
    };
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  async findById(@Param('id') id: string) {
    const customer = await this.customerService.findById(id);
    return customer ? CustomerResponseDto.fromDomain(customer) : null;
  }

  @Post()
  @RequirePermissions('customers:create')
  async create(@Body() dto: CreateCustomerHttpDto) {
    const command = new CreateCustomerCommand(
      dto.name,
      dto.email,
      dto.phone,
      dto.address,
      dto.city,
      dto.contactPerson,
      dto.taxId,
      dto.notes,
    );
    const customer = await this.customerService.create(command);
    return CustomerResponseDto.fromDomain(customer);
  }

  @Patch(':id')
  @RequirePermissions('customers:update')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerHttpDto) {
    const command = new UpdateCustomerCommand(
      dto.name,
      dto.email,
      dto.phone,
      dto.address,
      dto.city,
      dto.contactPerson,
      dto.taxId,
      dto.notes,
      dto.status,
    );
    const customer = await this.customerService.update(id, command);
    return CustomerResponseDto.fromDomain(customer);
  }

  @Delete(':id')
  @RequirePermissions('customers:delete')
  async delete(@Param('id') id: string) {
    return this.customerService.delete(id);
  }
}
