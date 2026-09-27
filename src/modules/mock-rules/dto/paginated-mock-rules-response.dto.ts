import { ApiProperty } from '@nestjs/swagger';
import { MockRuleResponseDto } from './mock-rule-response.dto';

export class PaginatedMockRulesResponseDto {
  @ApiProperty({ type: [MockRuleResponseDto] })
  items!: MockRuleResponseDto[];

  @ApiProperty({ example: 42, description: 'Общее количество правил' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Текущая страница' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Размер страницы' })
  limit!: number;

  @ApiProperty({ example: 3, description: 'Всего страниц' })
  totalPages!: number;
}
