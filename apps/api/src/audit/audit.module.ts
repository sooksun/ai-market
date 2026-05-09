import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { HeuristicRulesService } from './heuristic-rules.service';
import { AiModule } from '../ai/ai.module';
import { ProcurementRulesModule } from '../procurement-rules/procurement-rules.module';

@Module({
  imports: [AiModule, ProcurementRulesModule],
  controllers: [AuditController],
  providers: [AuditService, HeuristicRulesService],
  exports: [AuditService],
})
export class AuditModule {}
