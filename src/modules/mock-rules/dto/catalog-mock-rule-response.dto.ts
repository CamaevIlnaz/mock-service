import { ApiProperty } from '@nestjs/swagger';
import { CatalogMockRuleOwnerDto } from './catalog-mock-rule-owner.dto';
import { MockRuleResponseDto } from './mock-rule-response.dto';

export class CatalogMockRuleResponseDto extends MockRuleResponseDto {
  @ApiProperty({
    example: 'Мок сервер #1',
    description: 'Название мок-сервера, которому принадлежит правило',
  })
  mockServerName!: string;

  @ApiProperty({
    example: 'dev',
    description: 'Код стенда мок-сервера',
  })
  standCode!: string;

  @ApiProperty({ type: CatalogMockRuleOwnerDto })
  owner!: CatalogMockRuleOwnerDto;
}
