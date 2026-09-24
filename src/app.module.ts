import { Module } from '@nestjs/common';
import { RegisterModule } from './register/register.module';
import { HealthModule } from './health/health.module';
import { StatusModule } from './status/status.module';

@Module({
  imports: [HealthModule, RegisterModule, StatusModule],
})
export class AppModule {}
