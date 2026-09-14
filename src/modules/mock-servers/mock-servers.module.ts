import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MockServersController } from './mock-servers.controller';
import { MockServersService } from './mock-servers.service';

@Module({
  imports: [AuthModule],
  controllers: [MockServersController],
  providers: [MockServersService],
  exports: [MockServersService],
})
export class MockServersModule {}
