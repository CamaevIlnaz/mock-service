import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthUserResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ example: 'ivanov' })
  login!: string;

  @ApiProperty({ example: 'Иван' })
  firstName!: string;

  @ApiProperty({ enum: Role, example: Role.user })
  role!: Role;

  @ApiPropertyOptional({
    example: '/uploads/avatars/clxyz123-uuid.jpg',
    nullable: true,
  })
  avatarUrl!: string | null;
}
