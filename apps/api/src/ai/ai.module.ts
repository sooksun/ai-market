import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { ParseItemsService } from './services/parse-items.service';
import { CloudinessService } from './services/cloudiness.service';
import { FileParserService } from './services/file-parser.service';
import { SpecWriterService } from './services/spec-writer.service';
import { AiInvocationService } from './ai-invocation.service';
import { ANTHROPIC, createAnthropic } from './anthropic.client';

@Module({
  controllers: [AiController],
  providers: [
    ParseItemsService,
    CloudinessService,
    FileParserService,
    SpecWriterService,
    AiInvocationService,
    {
      provide: ANTHROPIC,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createAnthropic(config.get<string>('ANTHROPIC_API_KEY')),
    },
  ],
  exports: [ParseItemsService, CloudinessService, SpecWriterService, AiInvocationService],
})
export class AiModule {}
