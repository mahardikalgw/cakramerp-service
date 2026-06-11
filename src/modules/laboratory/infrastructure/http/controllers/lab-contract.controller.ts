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
import { LabContractService } from '../../../application/services/lab-contract.service';
import {
  CreateLabContractHttpDto,
  UpdateLabContractHttpDto,
} from '../dtos/lab-contract.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabContractController {
  constructor(private readonly labContractService: LabContractService) {}

  @Get('contracts')
  @RequirePermissions('contracts:read')
  async listContracts(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.labContractService.findAll({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('contracts/:id')
  @RequirePermissions('contracts:read')
  async getContract(@Param('id') id: string) {
    return this.labContractService.findById(id);
  }

  @Post('contracts')
  @RequirePermissions('contracts:create')
  async createContract(@Body() dto: CreateLabContractHttpDto) {
    return this.labContractService.create({
      customerId: dto.customerId,
      customerName: dto.customerName ?? '',
      projectName: dto.projectName,
      startDate: dto.startDate,
      endDate: dto.endDate,
      contractValue: dto.contractValue,
      totalQuota: dto.totalQuota,
      lines: dto.attachments,
    });
  }

  @Put('contracts/:id')
  @RequirePermissions('contracts:update')
  async updateContract(
    @Param('id') id: string,
    @Body() dto: UpdateLabContractHttpDto,
  ) {
    return this.labContractService.update(id, dto);
  }

  @Patch('contracts/:id/approve')
  @RequirePermissions('contracts:approve')
  async approveContract(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.labContractService.approve(id, userId);
  }

  @Patch('contracts/:id/submit-for-review')
  @RequirePermissions('contracts:update')
  async submitForReview(@Param('id') id: string) {
    return this.labContractService.submitForReview(id);
  }

  @Patch('contracts/:id/activate')
  @RequirePermissions('contracts:approve')
  async activateContract(@Param('id') id: string) {
    return this.labContractService.activate(id);
  }

  @Patch('contracts/:id/close')
  @RequirePermissions('contracts:approve')
  async closeContract(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.labContractService.close(id, userId);
  }

  @Post('contracts/:id/attachments')
  @RequirePermissions('contracts:update')
  async uploadAttachment(
    @Param('id') id: string,
    @Body() dto: { fileName: string; fileUrl: string; fileType?: string },
  ) {
    return this.labContractService.uploadAttachment(
      id,
      dto.fileName,
      dto.fileUrl,
      dto.fileType,
    );
  }

  @Delete('contracts/:id')
  @RequirePermissions('contracts:delete')
  async deleteContract(@Param('id') id: string) {
    await this.labContractService.delete(id);
    return { success: true };
  }
}
