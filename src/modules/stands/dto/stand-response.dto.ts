import { ApiProperty } from '@nestjs/swagger';

export class StandResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ example: 'dev' })
  code!: string;

  @ApiProperty({ example: 'Dev стенд' })
  name!: string;

  @ApiProperty({ example: 'https://dev.example.com' })
  domain!: string;

  @ApiProperty({ example: '/api/v1' })
  basePath!: string;

  @ApiProperty({ example: '2026-09-09T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-09T12:00:00.000Z' })
  updatedAt!: Date;
}
