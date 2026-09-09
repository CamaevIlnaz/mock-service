import { PartialType } from '@nestjs/swagger';
import { CreateStandDto } from './create-stand.dto';

export class UpdateStandDto extends PartialType(CreateStandDto) {}
