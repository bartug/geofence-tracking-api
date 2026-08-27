import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { AreasController } from './areas.controller';
import { AreasRepository } from './areas.repository';
import { AreasService } from './areas.service';
import { Area } from './entities/area.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Area]), CacheModule],
  controllers: [AreasController],
  providers: [AreasService, AreasRepository],
  exports: [AreasService],
})
export class AreasModule {}
