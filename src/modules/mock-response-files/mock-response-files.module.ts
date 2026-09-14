import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MockServersModule } from '../mock-servers/mock-servers.module';
import { MockResponseFilesController } from './mock-response-files.controller';
import { MockResponseFilesService } from './mock-response-files.service';

@Module({
  imports: [AuthModule, MockServersModule],
  controllers: [MockResponseFilesController],
  providers: [MockResponseFilesService],
})
export class MockResponseFilesModule {}
