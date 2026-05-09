import { Module, forwardRef } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { ComparisonService } from './comparison.service';
import { ComparisonController } from './comparison.controller';
import { ApprovalsModule } from '../approvals/approvals.module';

@Module({
  imports: [forwardRef(() => ApprovalsModule)],
  controllers: [QuotationsController, ComparisonController],
  providers: [QuotationsService, ComparisonService],
  exports: [QuotationsService, ComparisonService],
})
export class QuotationsModule {}
