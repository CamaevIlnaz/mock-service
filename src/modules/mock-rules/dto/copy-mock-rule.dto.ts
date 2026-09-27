import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CopyMockRuleDto {
  @ApiProperty({
    example: 2,
    description: 'ID целевого мок-сервера текущего пользователя',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetMockServerId!: number;
}
