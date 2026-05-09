import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { ParseItemsService } from './services/parse-items.service';
import { CloudinessService } from './services/cloudiness.service';
import { FileParserService } from './services/file-parser.service';
import { SpecWriterService } from './services/spec-writer.service';
import { CompareSummaryService } from './services/compare-summary.service';
import { AiInvocationService } from './ai-invocation.service';
import { QuotationsModule } from '../quotations/quotations.module';
import { ANTHROPIC, createAnthropic } from './anthropic.client';

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
    {
      provide: ANTHROPIC,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createAnthropic(config.get<string>('ANTHROPIC_API_KEY')),
    },
  ],
  exports: [
    ParseItemsService,
    CloudinessService,
    SpecWriterService,
    CompareSummaryService,
    AiInvocationService,
    ANTHROPIC,
  ],
})
export class AiModule {}
