import { Injectable, Inject } from '@nestjs/common'
import { MyScheduleServicePort } from '../ports/my-schedule-service.port'
import { SHIFT_SCHEDULE_REPOSITORY } from '../../domain/repositories/self-service-repository.port'
import type { ShiftScheduleRepositoryPort } from '../../domain/repositories/self-service-repository.port'

@Injectable()
export class MyScheduleService implements MyScheduleServicePort {
  constructor(
    @Inject(SHIFT_SCHEDULE_REPOSITORY)
    private readonly shiftScheduleRepo: ShiftScheduleRepositoryPort,
  ) {}

  async getSchedule(employeeId: string, weeks: number = 2): Promise<any[]> {
    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + weeks * 7)

    return this.shiftScheduleRepo.findByEmployeeAndDateRange(employeeId, startDate, endDate)
  }
}
