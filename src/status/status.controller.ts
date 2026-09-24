import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { StatusService } from './status.service';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  async getAll(): Promise<string> {
    const health = await this.statusService.getStatus();

      if (!health.connected) {
      throw new ServiceUnavailableException(health);
    }

    return 'Conexão OK';
  }
}
