import { PartialType } from '@nestjs/swagger';
import { CreateMockServerDto } from './create-mock-server.dto';

export class UpdateMockServerDto extends PartialType(CreateMockServerDto) {}
