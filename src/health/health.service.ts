import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async startup(): Promise<{ status: string; connected: boolean; now: string }> {
    console.log(`Startup check ${new Date().toISOString()}`);

    return {
      status: 'ok',
      connected: true,
      now: new Date().toISOString(),
    };
  }

  async readiness(): Promise<{ status: string; connected: boolean; now: string }> {
    const connected = await this.prisma.isDatabaseConnected();

    console.log(`Readiness check ${new Date().toISOString()}`);

    return {
      status: connected ? 'ok' : 'error',
      connected: connected,
      now: new Date().toISOString(),
    };
  }
  
  async liveness(): Promise<{ status: string; connected: boolean; now: string }> {
    console.log(`Liveness check ${new Date().toISOString()}`);

    return {
      status: 'ok',
      connected: true,
      now: new Date().toISOString(),
    };
  }
}
