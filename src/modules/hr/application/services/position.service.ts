import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { POSITION_REPOSITORY } from '../../domain/repositories/position-repository.port';
import type { PositionRepositoryPort } from '../../domain/repositories/position-repository.port';
import { DEPARTMENT_REPOSITORY } from '../../domain/repositories/department-repository.port';
import type { DepartmentRepositoryPort } from '../../domain/repositories/department-repository.port';
import type { PositionServicePort } from '../ports/position-service.port';
import { CreatePositionCommand } from '../commands/create-position.command';
import { UpdatePositionCommand } from '../commands/update-position.command';

@Injectable()
export class PositionService implements PositionServicePort {
  constructor(
    @Inject(POSITION_REPOSITORY)
    private readonly positionRepo: PositionRepositoryPort,
    @Inject(DEPARTMENT_REPOSITORY)
    private readonly departmentRepo: DepartmentRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string;
    departmentId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    return this.positionRepo.findAll(filters);
  }

  async findById(id: string): Promise<any> {
    const position = await this.positionRepo.findById(id);
    if (!position) throw new NotFoundException('Position not found');
    return position;
  }

  async create(command: CreatePositionCommand): Promise<any> {
    if (command.departmentId) {
      const department = await this.departmentRepo.findById(
        command.departmentId,
      );
      if (!department) throw new NotFoundException('Department not found');
    }

    const existing = await this.positionRepo.findByNameAndDepartment(
      command.name,
      command.departmentId,
    );
    if (existing)
      throw new ConflictException('Position already exists in this department');

    return this.positionRepo.create({
      name: command.name,
      departmentId: command.departmentId,
      description: command.description,
      isActive: true,
    });
  }

  async update(id: string, command: UpdatePositionCommand): Promise<any> {
    const position = await this.positionRepo.findById(id);
    if (!position) throw new NotFoundException('Position not found');

    if (command.departmentId) {
      const department = await this.departmentRepo.findById(
        command.departmentId,
      );
      if (!department) throw new NotFoundException('Department not found');
    }

    if (command.name || command.departmentId) {
      const checkName = command.name ?? position.name;
      const checkDeptId = command.departmentId ?? position.departmentId;
      const existing = await this.positionRepo.findByNameAndDepartment(
        checkName,
        checkDeptId,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Position already exists in this department',
        );
      }
    }

    const updateData: any = {};
    if (command.name !== undefined) updateData.name = command.name;
    if (command.departmentId !== undefined)
      updateData.departmentId = command.departmentId;
    if (command.description !== undefined)
      updateData.description = command.description;
    if (command.isActive !== undefined) updateData.isActive = command.isActive;

    return this.positionRepo.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    const position = await this.positionRepo.findById(id);
    if (!position) throw new NotFoundException('Position not found');
    await this.positionRepo.delete(id);
  }
}
