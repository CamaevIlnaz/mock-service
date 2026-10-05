import { ApiProperty } from '@nestjs/swagger';
import { MockResponseFileMetaDto } from './mock-response-file-meta.dto';

export class PaginatedMockResponseFilesResponseDto {
  @ApiProperty({ type: [MockResponseFileMetaDto] })
  items!: MockResponseFileMetaDto[];

  @ApiProperty({ example: 42, description: 'Общее количество файлов' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Текущая страница' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Размер страницы' })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Всего страниц' })
  totalPages!: number;
}
