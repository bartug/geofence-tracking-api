import { Module } from '@nestjs/common';
import { AreasCacheService } from './areas-cache.service';

@Module({
  providers: [AreasCacheService],
  exports: [AreasCacheService],
})
export class CacheModule {}
