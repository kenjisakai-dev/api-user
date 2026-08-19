import { Controller, Post } from '@nestjs/common';
import { RegisterService } from './register.service';

@Controller('registers')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Post()
  async create(): Promise<void> {
    return await this.registerService.create();
  }
}
