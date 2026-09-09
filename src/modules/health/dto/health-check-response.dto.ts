import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status!: 'ok' | 'error';

  @ApiProperty({
    description: 'Успешные проверки',
    example: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
    },
  })
  info!: Record<string, { status: string }>;

  @ApiProperty({
    description: 'Проваленные проверки',
    example: {},
  })
  error!: Record<string, unknown>;

  @ApiProperty({
    description: 'Детали всех проверок',
    example: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
    },
  })
  details!: Record<string, { status: string }>;
}
