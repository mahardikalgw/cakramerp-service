import {
  Inject,
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { FindResult } from '../../../../shared/kernel/domain/repositories/repository.port';
import { User } from '../../domain/entities/user.entity';
import type { UserRepositoryPort } from '../../domain/repositories/user-repository.port';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.port';
import { CreateUserCommand } from '../commands/create-user.command';
import { UpdateUserCommand } from '../commands/update-user.command';
import { UserServicePort } from '../ports/user-service.port';

@Injectable()
export class UserService implements UserServicePort {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async create(command: CreateUserCommand): Promise<User> {
    const exists = await this.userRepository.existsByEmail(command.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcryptjs.hash(command.password, 12);
    const user = new User({
      email: command.email,
      passwordHash,
      firstName: command.firstName,
      lastName: command.lastName,
    });

    return this.userRepository.save(user);
  }

  async findAll(page = 1, limit = 20): Promise<FindResult<User>> {
    return this.userRepository.findAll({ page, limit });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, command: UpdateUserCommand): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (command.firstName !== undefined) user.firstName = command.firstName;
    if (command.lastName !== undefined) user.lastName = command.lastName;
    if (command.status !== undefined) {
      if (command.status === 'active') user.activate();
      else if (command.status === 'inactive') user.deactivate();
    }

    return this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) throw new NotFoundException('User not found');
  }
}
