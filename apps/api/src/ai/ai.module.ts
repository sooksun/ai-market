import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { ParseItemsService } from './services/parse-items.service';
import { CloudinessService } from './services/cloudiness.service';
import { FileParserService } from './services/file-parser.service';
import { SpecWriterService } from './services/spec-writer.service';
import { CompareSummaryService } from './services/compare-summary.service';
import { AiInvocationService } from './ai-invocation.service';
import { LlmService } from './llm.service';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [QuotationsModule],
  controllers: [AiController],
  providers: [
    ParseItemsService,
    CloudinessService,
    FileParserService,
    SpecWriterService,
    CompareSummaryService,
    AiInvocationService,
    LlmService,
  ],
  exports: [
    ParseItemsService,
    CloudinessService,
    SpecWriterService,
    CompareSummaryService,
    AiInvocationService,
    LlmService,
  ],
})
export class AiModule {}
