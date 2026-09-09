import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ example: 'ivanov' })
  login!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;

  @ApiProperty({ example: 'Иванов' })
  lastName!: string;

  @ApiPropertyOptional({
    example: '/uploads/avatars/clxyz123-uuid.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;
}
