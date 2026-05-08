import { Module } from '@nestjs/common';
import { BudgetSourcesController } from './budget-sources.controller';
import { BudgetSourcesService } from './budget-sources.service';

@Module({
  controllers: [BudgetSourcesController],
  providers: [BudgetSourcesService],
})
export class BudgetSourcesModule {}
