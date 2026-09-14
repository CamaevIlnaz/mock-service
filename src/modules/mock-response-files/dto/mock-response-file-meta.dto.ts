import { ApiProperty } from '@nestjs/swagger';

export class MockResponseFileMetaDto {
  @ApiProperty({ example: 'clfile123' })
  id!: string;

  @ApiProperty({ example: 'products.json' })
  originalName!: string;

  @ApiProperty({ example: 'application/json' })
  mimeType!: string;

  @ApiProperty({ example: 1024 })
  sizeBytes!: number;

  @ApiProperty({ example: '2026-09-10T12:00:00.000Z' })
  createdAt!: Date;
}
