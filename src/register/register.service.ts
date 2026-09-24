import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RegisterService {
  constructor(private prisma: PrismaService) {}

  async create(): Promise<void> {
    await this.prisma.register.create({});
  }

  async getAll(): Promise<{ id: number; createdAt: Date }[]> {
    return await this.prisma.register.findMany({});
  }
}
