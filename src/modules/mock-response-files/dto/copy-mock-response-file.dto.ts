import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CopyMockResponseFileDto {
  @ApiPropertyOptional({
    example: 2,
    description:
      'ID целевого мок-сервера текущего пользователя. По умолчанию — текущий мок-сервер',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetMockServerId?: number;

  @ApiPropertyOptional({
    example: 'products (копия).json',
    maxLength: 255,
    description:
      'Название копии. По умолчанию — «<имя> (копия)». Расширение добавляется автоматически',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName?: string;
}
