import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HttpMethod, MockResponseType } from '@prisma/client';
import { MockResponseFileMetaDto } from '../../mock-response-files/dto/mock-response-file-meta.dto';

export class MockRuleResponseDto {
  @ApiProperty({ example: 'clrule123' })
  id!: string;

  @ApiProperty({ example: 'clserver123' })
  mockServerId!: string;

  @ApiProperty({ example: 'Получить продукт' })
  name!: string;

  @ApiProperty({ enum: HttpMethod, example: HttpMethod.GET })
  method!: HttpMethod;

  @ApiProperty({ example: '/api/products/:id' })
  urlMask!: string;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({
    example: 0,
    description: 'Меньшее значение — выше приоритет',
  })
  priority!: number;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 0 })
  delayMs!: number;

  @ApiProperty({
    enum: MockResponseType,
    example: MockResponseType.INLINE_JSON,
  })
  responseType!: MockResponseType;

  @ApiPropertyOptional({
    example: { id: '1', name: 'Product' },
    nullable: true,
  })
  responseBody!: unknown;

  @ApiPropertyOptional({ example: 'clfile123', nullable: true })
  responseFileId!: string | null;

  @ApiPropertyOptional({
    example: { 'X-Mock': 'true' },
    nullable: true,
  })
  responseHeaders!: Record<string, string> | null;

  @ApiPropertyOptional({ type: MockResponseFileMetaDto, nullable: true })
  responseFile!: MockResponseFileMetaDto | null;

  @ApiProperty({ example: '2026-09-10T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-10T12:00:00.000Z' })
  updatedAt!: Date;
}
