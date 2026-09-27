import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockServer } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { removeMockServerResponseDir } from '../../common/utils/mock-response-storage';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMockServerDto } from './dto/create-mock-server.dto';
import { MockServerResponseDto } from './dto/mock-server-response.dto';
import { UpdateMockServerDto } from './dto/update-mock-server.dto';

@Injectable()
export class MockServersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(userId: number): Promise<MockServerResponseDto[]> {
    const servers = await this.prisma.mockServer.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
    return servers.map((server) => this.toResponse(server));
  }

  async findOne(userId: number, id: number): Promise<MockServerResponseDto> {
    const server = await this.findOwnedOrFail(userId, id);
    return this.toResponse(server);
  }

  async create(
    userId: number,
    dto: CreateMockServerDto,
  ): Promise<MockServerResponseDto> {
    await this.ensureStandExists(dto.standCode);

    const existingCount = await this.prisma.mockServer.count({
      where: { userId },
    });

    const name = dto.name?.trim() || `Мок сервер #${existingCount + 1}`;

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const maxSort = await this.prisma.mockServer.aggregate({
        where: { userId },
        _max: { sortOrder: true },
      });
      sortOrder =
        maxSort._max.sortOrder === null ? 0 : maxSort._max.sortOrder + 1;
    }

    const server = await this.prisma.mockServer.create({
      data: {
        name,
        standCode: dto.standCode,
        userId,
        sortOrder,
        connectionToken: this.generateConnectionToken(),
      },
    });

    return this.toResponse(server);
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateMockServerDto,
  ): Promise<MockServerResponseDto> {
    await this.findOwnedOrFail(userId, id);

    if (dto.standCode !== undefined) {
      await this.ensureStandExists(dto.standCode);
    }

    const server = await this.prisma.mockServer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.standCode !== undefined ? { standCode: dto.standCode } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return this.toResponse(server);
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.findOwnedOrFail(userId, id);
    await this.prisma.mockServer.delete({ where: { id } });

    const uploadsDir = this.configService.get<string>(
      'app.uploadsDir',
      'uploads',
    );
    await removeMockServerResponseDir(uploadsDir, id);
  }

  async findOwnedOrFail(userId: number, id: number): Promise<MockServer> {
    const server = await this.prisma.mockServer.findFirst({
      where: { id, userId },
    });
    if (!server) {
      throw new NotFoundException('Мок-сервер не найден');
    }
    return server;
  }

  private async ensureStandExists(standCode: string): Promise<void> {
    const stand = await this.prisma.stand.findUnique({
      where: { code: standCode },
      select: { code: true },
    });
    if (!stand) {
      throw new BadRequestException('Стенд с таким code не найден');
    }
  }

  private generateConnectionToken(): string {
    return randomBytes(32).toString('hex');
  }

  private toResponse(server: MockServer): MockServerResponseDto {
    return {
      id: server.id,
      name: server.name,
      sortOrder: server.sortOrder,
      standCode: server.standCode,
      userId: server.userId,
      connectionToken: server.connectionToken,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    };
  }
}
