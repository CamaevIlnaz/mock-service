import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MockResponseFilesModule } from './modules/mock-response-files/mock-response-files.module';
import { MockRulesModule } from './modules/mock-rules/mock-rules.module';
import { MockServersModule } from './modules/mock-servers/mock-servers.module';
import { StandsModule } from './modules/stands/stands.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    StandsModule,
    MockServersModule,
    MockRulesModule,
    MockResponseFilesModule,
  ],
})
export class AppModule {}
