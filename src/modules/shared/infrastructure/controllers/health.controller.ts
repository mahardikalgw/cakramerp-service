import { Controller, Get } from '@nestjs/common';
import { DatabaseHealthService } from '../../../../database/application/services/database-health.service';

interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly databaseHealthService: DatabaseHealthService) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    const dbHealthy = await this.databaseHealthService.isHealthy();

    return {
      status: dbHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbHealthy ? 'ok' : 'error',
      },
    };
  }

  @Get('ready')
  async ready(): Promise<{ status: string }> {
    const dbHealthy = await this.databaseHealthService.isHealthy();
    if (!dbHealthy) {
      return { status: 'not ready' };
    }
    return { status: 'ready' };
  }

  @Get('live')
  live(): { status: string } {
    return { status: 'alive' };
  }
}
