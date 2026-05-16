import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/** NestJS Module for  cloudinary. */
@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
