import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BudgetsModule } from '../budgets/budgets.module';
import { PrController } from './pr.controller';
import { PrService } from './pr.service';

@Module({
  imports: [AiModule, BudgetsModule],
  controllers: [PrController],
  providers: [PrService],
  exports: [PrService],
})
export class PrModule {}
