import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MockServersModule } from '../mock-servers/mock-servers.module';
import { MockRulesCatalogController } from './mock-rules-catalog.controller';
import { MockRulesController } from './mock-rules.controller';
import { MockRulesService } from './mock-rules.service';

@Module({
  imports: [AuthModule, MockServersModule],
  controllers: [MockRulesController, MockRulesCatalogController],
  providers: [MockRulesService],
  exports: [MockRulesService],
})
export class MockRulesModule {}
