import { PartialType } from '@nestjs/swagger';
import { CreateMockRuleDto } from './create-mock-rule.dto';

export class UpdateMockRuleDto extends PartialType(CreateMockRuleDto) {}
