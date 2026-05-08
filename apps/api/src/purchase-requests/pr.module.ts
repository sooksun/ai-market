import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrController } from './pr.controller';
import { PrService } from './pr.service';

@Module({
  imports: [AiModule],
  controllers: [PrController],
  providers: [PrService],
  exports: [PrService],
})
export class PrModule {}
