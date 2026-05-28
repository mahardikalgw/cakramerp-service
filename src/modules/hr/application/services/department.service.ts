import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common'
import { DEPARTMENT_REPOSITORY } from '../../domain/repositories/department-repository.port'
import type { DepartmentRepositoryPort } from '../../domain/repositories/department-repository.port'
import type { DepartmentServicePort } from '../ports/department-service.port'
import { CreateDepartmentCommand } from '../commands/create-department.command'
import { UpdateDepartmentCommand } from '../commands/update-department.command'

@Injectable()
export class DepartmentService implements DepartmentServicePort {
  constructor(
    @Inject(DEPARTMENT_REPOSITORY)
    private readonly departmentRepo: DepartmentRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string; isActive?: boolean; page?: number; limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    return this.departmentRepo.findAll(filters)
  }

  async findById(id: string): Promise<any> {
    const department = await this.departmentRepo.findById(id)
    if (!department) throw new NotFoundException('Department not found')
    return department
  }

  async create(command: CreateDepartmentCommand): Promise<any> {
    const existing = await this.departmentRepo.findByName(command.name)
    if (existing) throw new ConflictException('Department name already exists')

    return this.departmentRepo.create({
      name: command.name,
      description: command.description,
      isActive: true,
    })
  }

  async update(id: string, command: UpdateDepartmentCommand): Promise<any> {
    const department = await this.departmentRepo.findById(id)
    if (!department) throw new NotFoundException('Department not found')

    if (command.name && command.name !== department.name) {
      const existing = await this.departmentRepo.findByName(command.name)
      if (existing) throw new ConflictException('Department name already exists')
    }

    const updateData: any = {}
    if (command.name !== undefined) updateData.name = command.name
    if (command.description !== undefined) updateData.description = command.description
    if (command.isActive !== undefined) updateData.isActive = command.isActive

    return this.departmentRepo.update(id, updateData)
  }

  async delete(id: string): Promise<void> {
    const department = await this.departmentRepo.findById(id)
    if (!department) throw new NotFoundException('Department not found')
    await this.departmentRepo.delete(id)
  }
}
