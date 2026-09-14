import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CopyMockRuleDto {
  @ApiProperty({
    example: 'cltarget123',
    description: 'ID целевого мок-сервера текущего пользователя',
  })
  @IsString()
  @IsNotEmpty()
  targetMockServerId!: string;
}
