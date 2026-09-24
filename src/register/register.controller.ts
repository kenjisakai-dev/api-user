import { Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { RegisterService } from './register.service';

@Controller('dados')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  async create(): Promise<void> {
    return await this.registerService.create();
  }

  @Get()
  async getAll(): Promise<{ id: number; createdAt: Date }[]> {
    return await this.registerService.getAll();
  }
}
