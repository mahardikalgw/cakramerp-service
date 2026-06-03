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
import { SUPPLIER_SERVICE } from '../../../application/ports/supplier-service.port';
import type { SupplierServicePort } from '../../../application/ports/supplier-service.port';
import { CreateSupplierCommand } from '../../../application/commands/create-supplier.command';
import { UpdateSupplierCommand } from '../../../application/commands/update-supplier.command';
import { CreateSupplierHttpDto } from '../dtos/create-supplier.dto';
import { UpdateSupplierHttpDto } from '../dtos/update-supplier.dto';
import { SupplierResponseDto } from '../dtos/supplier-response.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierController {
  constructor(
    @Inject(SUPPLIER_SERVICE)
    private readonly supplierService: SupplierServicePort,
  ) {}

  @Get()
  @RequirePermissions('suppliers:read')
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.supplierService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      data: result.data.map((s) => SupplierResponseDto.fromDomain(s)),
      total: result.total,
    };
  }

  @Get(':id')
  @RequirePermissions('suppliers:read')
  async findById(@Param('id') id: string) {
    const supplier = await this.supplierService.findById(id);
    return supplier ? SupplierResponseDto.fromDomain(supplier) : null;
  }

  @Post()
  @RequirePermissions('suppliers:create')
  async create(@Body() dto: CreateSupplierHttpDto) {
    const command = new CreateSupplierCommand(
      dto.name,
      dto.email,
      dto.phone,
      dto.address,
      dto.city,
      dto.contactPerson,
      dto.taxId,
      dto.bankAccount,
      dto.bankName,
      dto.notes,
    );
    const supplier = await this.supplierService.create(command);
    return SupplierResponseDto.fromDomain(supplier);
  }

  @Patch(':id')
  @RequirePermissions('suppliers:update')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierHttpDto) {
    const command = new UpdateSupplierCommand(
      dto.name,
      dto.email,
      dto.phone,
      dto.address,
      dto.city,
      dto.contactPerson,
      dto.taxId,
      dto.bankAccount,
      dto.bankName,
      dto.notes,
      dto.status,
    );
    const supplier = await this.supplierService.update(id, command);
    return SupplierResponseDto.fromDomain(supplier);
  }

  @Delete(':id')
  @RequirePermissions('suppliers:delete')
  async delete(@Param('id') id: string) {
    return this.supplierService.delete(id);
  }
}
