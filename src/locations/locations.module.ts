import { Module } from '@nestjs/common';
import { AreasModule } from '../areas/areas.module';
import { LogsModule } from '../logs/logs.module';
import { PostgisContainmentStrategy } from './containment/postgis-containment.strategy';
import { GEOFENCE_CONTAINMENT_STRATEGY } from './containment/geofence-containment.strategy';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { RedisUserAreaStateStore } from './state/redis-user-area-state.store';
import { USER_AREA_STATE_STORE } from './state/user-area-state.store';

@Module({
  imports: [AreasModule, LogsModule],
  controllers: [LocationsController],
  providers: [
    LocationsService,
    {
      provide: GEOFENCE_CONTAINMENT_STRATEGY,
      useClass: PostgisContainmentStrategy,
    },
    { provide: USER_AREA_STATE_STORE, useClass: RedisUserAreaStateStore },
  ],
})
export class LocationsModule {}
