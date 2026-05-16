import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** NestJS Module for  prisma. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
