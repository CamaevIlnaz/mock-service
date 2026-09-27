import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthUserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'ivanov' })
  login!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;

  @ApiProperty({ enum: Role, example: Role.user })
  role!: Role;

  @ApiPropertyOptional({
    example: '/uploads/avatars/1-uuid.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;
}
