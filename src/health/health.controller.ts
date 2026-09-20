import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('startup')
  async startup(): Promise<{ status: string; connected: boolean; now: string }> {
    return this.healthService.startup();
  }

  @Get('readiness')
  async readiness(): Promise<{ status: string; connected: boolean; now: string }> {
    const health = await this.healthService.readiness();

    if (!health.connected) {
      throw new ServiceUnavailableException(health);
    }

    return health;
  }

  @Get('liveness')
  async liveness(): Promise<{ status: string; connected: boolean; now: string }> {
    return this.healthService.liveness();
  }
}
