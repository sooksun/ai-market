import { Module } from '@nestjs/common';
import { PrModule } from '../purchase-requests/pr.module';
import { ExportsController } from './exports.controller';
import { PrXlsxService } from './pr-xlsx.service';

@Module({
  imports: [PrModule],
  controllers: [ExportsController],
  providers: [PrXlsxService],
})
export class ExportsModule {}
