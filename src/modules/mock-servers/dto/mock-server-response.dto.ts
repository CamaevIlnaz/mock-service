import { ApiProperty } from '@nestjs/swagger';

export class MockServerResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ example: 'Мок сервер #1' })
  name!: string;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: 'dev' })
  standCode!: string;

  @ApiProperty({ example: 'cluser123' })
  userId!: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
  })
  connectionToken!: string;

  @ApiProperty({ example: '2026-09-09T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-09T12:00:00.000Z' })
  updatedAt!: Date;
}
