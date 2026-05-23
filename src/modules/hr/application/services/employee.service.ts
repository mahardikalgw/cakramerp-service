import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common'
import { EMPLOYEE_REPOSITORY } from '../../domain/repositories/employee-repository.port'
import type { EmployeeRepositoryPort } from '../../domain/repositories/employee-repository.port'
import type { EmployeeServicePort } from '../ports/employee-service.port'

export interface CreateEmployeeDto {
  fullName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  address?: string
  employmentType: string
  positionId?: string
  positionName?: string
  departmentId?: string
  departmentName?: string
  siteId?: string
  siteName?: string
  joinDate: string
  basicSalary: number
  bankAccountNumber?: string
  bankName?: string
  npwp?: string
  bpjsKesehatanNumber?: string
  bpjsKetenagakerjaanNumber?: string
}

export interface UpdateEmployeeDto {
  fullName?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  address?: string
  employmentType?: string
  positionId?: string
  positionName?: string
  departmentId?: string
  departmentName?: string
  siteId?: string
  siteName?: string
  endDate?: string
  status?: string
  basicSalary?: number
  bankAccountNumber?: string
  bankName?: string
  npwp?: string
  bpjsKesehatanNumber?: string
  bpjsKetenagakerjaanNumber?: string
}

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

  async create(dto: CreateEmployeeDto): Promise<any> {
    const employeeNumber = await this.generateEmployeeNumber()

    return this.employeeRepo.create({
      employeeNumber,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      address: dto.address,
      employmentType: dto.employmentType,
      positionId: dto.positionId,
      positionName: dto.positionName,
      departmentId: dto.departmentId,
      departmentName: dto.departmentName,
      siteId: dto.siteId,
      siteName: dto.siteName,
      joinDate: new Date(dto.joinDate),
      basicSalary: dto.basicSalary,
      bankAccountNumber: dto.bankAccountNumber,
      bankName: dto.bankName,
      npwp: dto.npwp,
      bpjsKesehatanNumber: dto.bpjsKesehatanNumber,
      bpjsKetenagakerjaanNumber: dto.bpjsKetenagakerjaanNumber,
      status: 'active',
    })
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<any> {
    const employee = await this.employeeRepo.findById(id)
    if (!employee) throw new NotFoundException('Employee not found')

    const updateData = {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : employee.dateOfBirth,
      endDate: dto.endDate ? new Date(dto.endDate) : employee.endDate,
    }

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
