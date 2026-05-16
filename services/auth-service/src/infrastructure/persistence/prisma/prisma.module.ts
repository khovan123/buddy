import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** NestJS Module for  prisma. */
@Global() // makes PrismaService available everywhere without re-importing
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
