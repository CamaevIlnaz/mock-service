import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Stand } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStandDto } from './dto/create-stand.dto';
import { StandResponseDto } from './dto/stand-response.dto';
import { UpdateStandDto } from './dto/update-stand.dto';

@Injectable()
export class StandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<StandResponseDto[]> {
    const stands = await this.prisma.stand.findMany({
      orderBy: { code: 'asc' },
    });
    return stands.map((stand) => this.toResponse(stand));
  }

  async findOne(id: string): Promise<StandResponseDto> {
    const stand = await this.prisma.stand.findUnique({ where: { id } });
    if (!stand) {
      throw new NotFoundException('Стенд не найден');
    }
    return this.toResponse(stand);
  }

  async create(dto: CreateStandDto): Promise<StandResponseDto> {
    try {
      const stand = await this.prisma.stand.create({
        data: {
          code: dto.code,
          name: dto.name,
          domain: dto.domain,
          basePath: dto.basePath,
        },
      });
      return this.toResponse(stand);
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateStandDto): Promise<StandResponseDto> {
    await this.ensureExists(id);

    try {
      const stand = await this.prisma.stand.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.domain !== undefined ? { domain: dto.domain } : {}),
          ...(dto.basePath !== undefined ? { basePath: dto.basePath } : {}),
        },
      });
      return this.toResponse(stand);
    } catch (error) {
      this.rethrowUniqueCodeConflict(error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const stand = await this.prisma.stand.findUnique({ where: { id } });
    if (!stand) {
      throw new NotFoundException('Стенд не найден');
    }

    const linkedCount = await this.prisma.mockServer.count({
      where: { standCode: stand.code },
    });

    if (linkedCount > 0) {
      throw new ConflictException(
        'Нельзя удалить стенд: к нему привязаны мок-серверы',
      );
    }

    await this.prisma.stand.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const stand = await this.prisma.stand.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!stand) {
      throw new NotFoundException('Стенд не найден');
    }
  }

  private rethrowUniqueCodeConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Стенд с таким code уже существует');
    }
  }

  private toResponse(stand: Stand): StandResponseDto {
    return {
      id: stand.id,
      code: stand.code,
      name: stand.name,
      domain: stand.domain,
      basePath: stand.basePath,
      createdAt: stand.createdAt,
      updatedAt: stand.updatedAt,
    };
  }
}
