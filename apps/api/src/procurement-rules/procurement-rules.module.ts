import { Module } from '@nestjs/common';
import { ProcurementRulesController } from './procurement-rules.controller';
import { ProcurementRulesService } from './procurement-rules.service';

@Module({
  controllers: [ProcurementRulesController],
  providers: [ProcurementRulesService],
  exports: [ProcurementRulesService],
})
export class ProcurementRulesModule {}
