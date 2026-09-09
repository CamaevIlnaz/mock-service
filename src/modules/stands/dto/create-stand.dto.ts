import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateStandDto {
  @ApiProperty({ example: 'dev' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Dev стенд' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'https://dev.example.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  domain!: string;

  @ApiProperty({ example: '/api/v1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  basePath!: string;
}
