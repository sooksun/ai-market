import { Module } from '@nestjs/common';
import { RuleConfigsController } from './rule-configs.controller';
import { RuleConfigsService } from './rule-configs.service';

@Module({
  controllers: [RuleConfigsController],
  providers: [RuleConfigsService],
})
export class RuleConfigsModule {}
