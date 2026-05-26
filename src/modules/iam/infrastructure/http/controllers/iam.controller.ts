import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import type { RoleServicePort } from '../../../application/ports/role-service.port';
import { ROLE_SERVICE } from '../../../application/ports/role-service.port';
import type { PermissionServicePort } from '../../../application/ports/permission-service.port';
import { PERMISSION_SERVICE } from '../../../application/ports/permission-service.port';
import { CreateRoleCommand } from '../../../application/commands/create-role.command';
import { CreatePermissionCommand } from '../../../application/commands/create-permission.command';
import { AssignRoleCommand } from '../../../application/commands/assign-role.command';
import { UpdateRolePermissionsCommand } from '../../../application/commands/update-role-permissions.command';
import { CreateRoleHttpDto } from '../dtos/create-role.dto';
import { CreatePermissionHttpDto } from '../dtos/create-permission.dto';
import { AssignRoleHttpDto } from '../dtos/assign-role.dto';
import { UpdateRolePermissionsHttpDto } from '../dtos/update-role-permissions.dto';
import { RoleResponseDto } from '../dtos/role-response.dto';
import { PermissionResponseDto } from '../dtos/permission-response.dto';

@Controller('iam')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IAMController {
  constructor(
    @Inject(ROLE_SERVICE)
    private readonly roleService: RoleServicePort,
    @Inject(PERMISSION_SERVICE)
    private readonly permissionService: PermissionServicePort,
  ) {}

  @Post('roles')
  @RequirePermissions('roles:create')
  async createRole(@Body() dto: CreateRoleHttpDto): Promise<RoleResponseDto> {
    const command = new CreateRoleCommand(
      dto.name,
      dto.description,
      dto.permissionIds,
    );
    const role = await this.roleService.create(command);
    return RoleResponseDto.fromDomain(role);
  }

  @Get('roles')
  @RequirePermissions('roles:read')
  async findAllRoles(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const result = await this.roleService.findAll(page, limit);
    return {
      data: result.data.map(RoleResponseDto.fromDomain),
      meta: result.meta,
    };
  }

  @Get('roles/:id')
  @RequirePermissions('roles:read')
  async findRoleById(@Param('id') id: string): Promise<RoleResponseDto> {
    const role = await this.roleService.findById(id);
    return RoleResponseDto.fromDomain(role);
  }

  @Delete('roles/:id')
  @RequirePermissions('roles:delete')
  async deleteRole(@Param('id') id: string): Promise<void> {
    return this.roleService.delete(id);
  }

  @Post('permissions')
  @RequirePermissions('permissions:read')
  async createPermission(
    @Body() dto: CreatePermissionHttpDto,
  ): Promise<PermissionResponseDto> {
    const command = new CreatePermissionCommand(
      dto.name,
      dto.resource,
      dto.action,
    );
    const permission = await this.permissionService.create(command);
    return PermissionResponseDto.fromDomain(permission);
  }

  @Get('permissions')
  @RequirePermissions('permissions:read')
  async findAllPermissions(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 200,
  ) {
    const result = await this.permissionService.findAll(page, limit);
    return {
      data: result.data.map(PermissionResponseDto.fromDomain),
      meta: result.meta,
    };
  }

  @Post('assign-roles')
  @RequirePermissions('roles:update')
  async assignRoles(@Body() dto: AssignRoleHttpDto): Promise<void> {
    const command = new AssignRoleCommand(dto.userId, dto.roleIds);
    return this.roleService.assignRolesToUser(command);
  }

  @Get('roles/:id/permissions')
  @RequirePermissions('roles:read')
  async getRolePermissions(@Param('id') id: string): Promise<RoleResponseDto> {
    const role = await this.roleService.findById(id);
    return RoleResponseDto.fromDomain(role);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('roles:update')
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsHttpDto,
  ): Promise<RoleResponseDto> {
    const command = new UpdateRolePermissionsCommand(id, dto.permissionIds);
    const role = await this.roleService.updatePermissions(command);
    // Log audit action with diff
    await this.roleService.logAuditAction({
      userId: 'system',
      action: 'update',
      module: 'Roles',
      recordId: id,
      payload: { permissionIds: dto.permissionIds },
    });
    return RoleResponseDto.fromDomain(role);
  }
}
