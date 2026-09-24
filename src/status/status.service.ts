import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StatusService {
  constructor(private prisma: PrismaService) {}

  async getStatus(): Promise<{ status: string; connected: boolean; now: string }> {
    const connected = await this.prisma.isDatabaseConnected();

    return {
      status: connected ? 'ok' : 'error',
      connected: connected,
      now: new Date().toISOString(),
    };
  }
}
