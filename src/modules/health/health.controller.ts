import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthCheckResponseDto } from './dto/health-check-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Проверка состояния сервиса и базы данных' })
  @ApiOkResponse({
    description: 'Сервис и зависимости в рабочем состоянии',
    type: HealthCheckResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Одна или несколько проверок завершились ошибкой',
    type: HealthCheckResponseDto,
  })
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
