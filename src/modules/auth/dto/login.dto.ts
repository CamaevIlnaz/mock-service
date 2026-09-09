import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ivanov' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  login!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
