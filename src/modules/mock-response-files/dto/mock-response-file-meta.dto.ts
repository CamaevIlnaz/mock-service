import { ApiProperty } from '@nestjs/swagger';

export class MockResponseFileMetaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'products.json' })
  originalName!: string;

  @ApiProperty({
    example: 'application/json',
    enum: ['application/json', 'application/pdf'],
  })
  mimeType!: string;

  @ApiProperty({ example: 1024 })
  sizeBytes!: number;

  @ApiProperty({ example: '2026-09-10T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-10T12:00:00.000Z' })
  updatedAt!: Date;
}
