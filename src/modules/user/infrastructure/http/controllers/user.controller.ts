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
} from '@nestjs/common';
import type { UserServicePort } from '../../../application/ports/user-service.port';
import { USER_SERVICE } from '../../../application/ports/user-service.port';
import { CreateUserCommand } from '../../../application/commands/create-user.command';
import { UpdateUserCommand } from '../../../application/commands/update-user.command';
import { CreateUserHttpDto } from '../dtos/create-user.dto';
import { UpdateUserHttpDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

@Controller('users')
export class UserController {
  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: UserServicePort,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserHttpDto): Promise<UserResponseDto> {
    const command = new CreateUserCommand(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
    );
    const user = await this.userService.create(command);
    return UserResponseDto.fromDomain(user);
  }

  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const result = await this.userService.findAll(page, limit);
    return {
      data: result.data.map(UserResponseDto.fromDomain),
      meta: result.meta,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id);
    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserHttpDto,
  ): Promise<UserResponseDto> {
    const command = new UpdateUserCommand(dto.firstName, dto.lastName, dto.status);
    const user = await this.userService.update(id, command);
    return UserResponseDto.fromDomain(user);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    return this.userService.delete(id);
  }
}
