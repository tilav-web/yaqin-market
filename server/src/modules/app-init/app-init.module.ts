import { Module } from '@nestjs/common';
import { AppInitService } from './app-init.service';

@Module({
  providers: [AppInitService],
})
export class AppInitModule {}
