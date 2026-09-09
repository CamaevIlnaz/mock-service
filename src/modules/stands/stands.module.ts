import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StandsController } from './stands.controller';
import { StandsService } from './stands.service';

@Module({
  imports: [AuthModule],
  controllers: [StandsController],
  providers: [StandsService],
  exports: [StandsService],
})
export class StandsModule {}
