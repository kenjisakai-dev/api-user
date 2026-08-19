import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  health(): { status: string; now: string } {
    return { status: 'ok', now: new Date().toISOString() };
  }
}
