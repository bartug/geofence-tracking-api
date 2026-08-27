import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasModule } from '../areas/areas.module';
import { LocationLog } from './entities/location-log.entity';
import { LogsController } from './logs.controller';
import { LogsRepository } from './logs.repository';
import { LogsService } from './logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocationLog]), AreasModule],
  controllers: [LogsController],
  providers: [LogsService, LogsRepository],
  exports: [LogsService],
})
export class LogsModule {}
