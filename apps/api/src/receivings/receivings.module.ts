import { Module } from '@nestjs/common';
import { ReceivingsService } from './receivings.service';
import { ReceivingsController } from './receivings.controller';

@Module({
  controllers: [ReceivingsController],
  providers: [ReceivingsService],
  exports: [ReceivingsService],
})
export class ReceivingsModule {}
