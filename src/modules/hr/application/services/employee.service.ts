import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common'
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port'
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port'
import type { EmployeeServicePort } from '../ports/employee-service.port'
import { CreateEmployeeCommand } from '../commands/create-employee.command'
import { UpdateEmployeeCommand } from '../commands/update-employee.command'

export interface UploadDocumentDto {
  type: string
  fileName: string
  filePath: string
  expiryDate?: string
}

export interface AddHistoryEventDto {
  eventType: string
  description: string
  previousValue?: string
  newValue?: string
  effectiveDate: string
}

@Injectable()
export class EmployeeService implements EmployeeServicePort {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY)
    private readonly employeeRepo: EmployeeRepositoryPort,
  ) {}

  async findAll(filters?: {
    search?: string
    employmentType?: string
    siteId?: string
    departmentId?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<{ data: any[]; total: number }> {
    return this.employeeRepo.findAll(filters)
  }

  async findById(id: string): Promise<{
    employee: any
    documents: any[]
    history: any[]
  }> {
    const employee = await this.employeeRepo.findById(id)
    if (!employee) throw new NotFoundException('Employee not found')

    const documents = await this.employeeRepo.getDocuments(id)
    const history = await this.employeeRepo.getHistory(id)

    return { employee, documents, history }
  }

  async create(command: CreateEmployeeCommand): Promise<any> {
    const employeeNumber = await this.generateEmployeeNumber()

    const fullName = `${command.firstName} ${command.lastName}`.trim()

    return this.employeeRepo.create({
      employeeNumber,
      fullName,
      email: command.email,
      phone: command.phone,
      employmentType: command.employmentType,
      departmentId: command.departmentId,
      siteId: command.siteId,
      positionName: command.position,
      joinDate: command.hireDate ? new Date(command.hireDate) : new Date(),
      basicSalary: command.baseSalary ?? 0,
      status: 'active',
    })
  }

  async update(id: string, command: UpdateEmployeeCommand): Promise<any> {
    const employee = await this.employeeRepo.findById(id)
    if (!employee) throw new NotFoundException('Employee not found')

    const updateData: any = {}

    if (command.firstName !== undefined || command.lastName !== undefined) {
      const firstName = command.firstName ?? employee.firstName ?? ''
      const lastName = command.lastName ?? employee.lastName ?? ''
      updateData.fullName = `${firstName} ${lastName}`.trim()
    }
    if (command.email !== undefined) updateData.email = command.email
    if (command.phone !== undefined) updateData.phone = command.phone
    if (command.employmentType !== undefined) updateData.employmentType = command.employmentType
    if (command.siteId !== undefined) updateData.siteId = command.siteId
    if (command.departmentId !== undefined) updateData.departmentId = command.departmentId
    if (command.position !== undefined) updateData.positionName = command.position
    if (command.baseSalary !== undefined) updateData.basicSalary = command.baseSalary
    if (command.hireDate !== undefined) updateData.joinDate = new Date(command.hireDate)
    if (command.status !== undefined) updateData.status = command.status

    return this.employeeRepo.update(id, updateData)
  }

  async uploadDocument(employeeId: string, dto: UploadDocumentDto): Promise<any> {
    const employee = await this.employeeRepo.findById(employeeId)
    if (!employee) throw new NotFoundException('Employee not found')

    return this.employeeRepo.createDocument({
      employeeId,
      type: dto.type,
      fileName: dto.fileName,
      filePath: dto.filePath,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    })
  }

  async getDocuments(employeeId: string): Promise<any[]> {
    return this.employeeRepo.getDocuments(employeeId)
  }

  async getHistory(employeeId: string): Promise<any[]> {
    return this.employeeRepo.getHistory(employeeId)
  }

  async addHistoryEvent(employeeId: string, dto: AddHistoryEventDto): Promise<any> {
    const employee = await this.employeeRepo.findById(employeeId)
    if (!employee) throw new NotFoundException('Employee not found')

    return this.employeeRepo.createHistoryEvent({
      employeeId,
      eventType: dto.eventType,
      description: dto.description,
      previousValue: dto.previousValue,
      newValue: dto.newValue,
      effectiveDate: new Date(dto.effectiveDate),
    })
  }

  private async generateEmployeeNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `EMP-${year}-`
    const lastNumber = await this.employeeRepo.getLastEmployeeNumber(prefix)

    if (!lastNumber) return `${prefix}0001`
    const seq = parseInt(lastNumber.replace(prefix, ''), 10) + 1
    return `${prefix}${seq.toString().padStart(4, '0')}`
  }
}