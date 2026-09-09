import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ivanov' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'login может содержать только латиницу, цифры, точку, _ и -',
  })
  login!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Иван' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Иванов' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;
}
