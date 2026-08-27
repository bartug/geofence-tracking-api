import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LogListResponseDto } from './dto/log-list-response.dto';
import { ListLogsQueryDto } from './dto/list-logs-query.dto';
import { LogListResult, LogsService } from './logs.service';

/**
 * @author Bartuğ Sevindik
 * @since 28.08.2026
 */
@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Loglanmış alan-giriş kayıtlarını filtreleyip sayfalı döner',
  })
  @ApiResponse({
    status: 200,
    description: 'Log listesi',
    type: LogListResponseDto,
  })
  findAll(@Query() query: ListLogsQueryDto): Promise<LogListResult> {
    return this.logsService.findAll(
      {
        userId: query.userId,
        areaId: query.areaId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      },
      query.page,
      query.limit,
    );
  }
}
