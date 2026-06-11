import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import type { UserServicePort } from '../../../application/ports/user-service.port';
import { USER_SERVICE } from '../../../application/ports/user-service.port';
import { CreateUserCommand } from '../../../application/commands/create-user.command';
import { UpdateUserCommand } from '../../../application/commands/update-user.command';
import { ChangePasswordCommand } from '../../../application/commands/change-password.command';
import { CreateUserHttpDto } from '../dtos/create-user.dto';
import { UpdateUserHttpDto } from '../dtos/update-user.dto';
import { ChangePasswordHttpDto } from '../dtos/change-password.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: UserServicePort,
  ) {}

  @Post()
  @RequirePermissions('users:create')
  async create(@Body() dto: CreateUserHttpDto): Promise<UserResponseDto> {
    const command = new CreateUserCommand(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      dto.roleIds,
      dto.status,
    );
    const user = await this.userService.create(command);
    return UserResponseDto.fromDomain(user);
  }

  @Get()
  @RequirePermissions('users:read')
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('search') search?: string,
  ) {
    const result = await this.userService.findAll(
      page,
      limit,
      undefined,
      undefined,
      search,
    );
    return {
      data: result.data.map((u) => UserResponseDto.fromDomain(u)),
      meta: result.meta,
    };
  }

  @Get(':id')
  @RequirePermissions('users:read')
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserHttpDto,
  ): Promise<UserResponseDto> {
    const command = new UpdateUserCommand(
      dto.firstName,
      dto.lastName,
      dto.status,
      dto.roleIds,
    );
    const user = await this.userService.update(id, command);
    return UserResponseDto.fromDomain(user);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  async delete(@Param('id') id: string): Promise<void> {
    return this.userService.delete(id);
  }

  @Patch(':id/change-password')
  @RequirePermissions('users:update')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordHttpDto,
  ): Promise<void> {
    const command = new ChangePasswordCommand(
      id,
      dto.oldPassword,
      dto.password,
    );
    await this.userService.changePassword(command);
  }
}
