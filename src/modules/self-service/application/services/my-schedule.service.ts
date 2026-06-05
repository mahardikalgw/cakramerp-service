import { Injectable, Inject } from '@nestjs/common';
import { MyScheduleServicePort } from '../ports/my-schedule-service.port';
import { SHIFT_SCHEDULE_REPOSITORY } from '../../domain/repositories/self-service-repository.port';
import type { ShiftScheduleRepositoryPort } from '../../domain/repositories/self-service-repository.port';

interface ScheduleWeek {
  weekLabel: string;
  startDate: string;
  endDate: string;
  days: any[];
}

@Injectable()
export class MyScheduleService implements MyScheduleServicePort {
  constructor(
    @Inject(SHIFT_SCHEDULE_REPOSITORY)
    private readonly shiftScheduleRepo: ShiftScheduleRepositoryPort,
  ) {}

  async getSchedule(
    employeeId: string,
    weeks: number = 2,
  ): Promise<{ data: ScheduleWeek[] }> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const startDay = startDate.getDay();
    const diffToMonday = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(startDate.getDate() + diffToMonday);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + weeks * 7 - 1);

    const shifts = await this.shiftScheduleRepo.findByEmployeeAndDateRange(
      employeeId,
      startDate,
      endDate,
    );

    const weekMap = new Map<string, any[]>();

    for (const shift of shifts) {
      const shiftDate = new Date(shift.date);
      shiftDate.setHours(0, 0, 0, 0);

      const day = shiftDate.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(shiftDate);
      weekStart.setDate(weekStart.getDate() + diffToMon);
      weekStart.setHours(0, 0, 0, 0);

      const key = weekStart.toISOString().split('T')[0];
      if (!weekMap.has(key)) {
        weekMap.set(key, []);
      }
      weekMap.get(key)!.push(shift);
    }

    const data: ScheduleWeek[] = [];
    const current = new Date(startDate);

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(current);
      weekStart.setDate(weekStart.getDate() + i * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(0, 0, 0, 0);

      const key = weekStart.toISOString().split('T')[0];
      const days = weekMap.get(key) || [];

      const weekNum = i + 1;
      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      data.push({
        weekLabel: `Week ${weekNum}`,
        startDate: startStr,
        endDate: endStr,
        days,
      });
    }

    return { data };
  }
}
