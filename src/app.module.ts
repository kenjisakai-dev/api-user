import { Module } from '@nestjs/common';
import { RegisterModule } from './register/register.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [HealthModule, RegisterModule],
})
export class AppModule {}
