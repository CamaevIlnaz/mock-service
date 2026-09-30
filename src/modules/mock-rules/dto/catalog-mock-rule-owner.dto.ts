import { ApiProperty } from '@nestjs/swagger';

export class CatalogMockRuleOwnerDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ivanov' })
  login!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;
}
