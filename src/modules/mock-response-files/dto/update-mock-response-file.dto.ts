import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateMockResponseFileDto {
  @ApiProperty({
    example: 'products-v2.json',
    maxLength: 255,
    description:
      'Новое оригинальное название файла. Расширение добавляется автоматически по типу файла',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName!: string;
}
