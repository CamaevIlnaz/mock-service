import { Module } from '@nestjs/common';
import { MockProxyController } from './mock-proxy.controller';
import { MockProxyService } from './mock-proxy.service';

@Module({
  controllers: [MockProxyController],
  providers: [MockProxyService],
})
export class MockProxyModule {}
