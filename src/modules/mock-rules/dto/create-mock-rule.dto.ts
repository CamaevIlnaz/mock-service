import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HttpMethod, MockResponseType } from '@prisma/client';
import {
  Allow,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateMockRuleDto {
  @ApiProperty({ example: 'Получить продукт' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: HttpMethod, example: HttpMethod.GET })
  @IsEnum(HttpMethod)
  method!: HttpMethod;

  @ApiProperty({ example: '/api/products/:id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  urlMask!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Меньшее значение — выше приоритет при совпадении масок',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ example: 200, default: 200 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  statusCode?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  delayMs?: number;

  @ApiProperty({
    enum: MockResponseType,
    example: MockResponseType.INLINE_JSON,
  })
  @IsEnum(MockResponseType)
  responseType!: MockResponseType;

  @ApiPropertyOptional({
    example: { id: '1', name: 'Product' },
    description: 'Обязателен для INLINE_JSON',
  })
  @ValidateIf(
    (dto: CreateMockRuleDto) =>
      dto.responseType === MockResponseType.INLINE_JSON,
  )
  @Allow()
  responseBody?: unknown;

  @ApiPropertyOptional({
    example: 'clfile123',
    description: 'ID существующего файла того же мок-сервера (для FILE)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  responseFileId?: string;

  @ApiPropertyOptional({
    example: { 'X-Mock': 'true' },
    description: 'Дополнительные заголовки ответа',
  })
  @IsOptional()
  @IsObject()
  responseHeaders?: Record<string, string>;
}
