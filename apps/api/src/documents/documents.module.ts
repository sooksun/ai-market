import { Module } from '@nestjs/common';
import { QuotationsModule } from '../quotations/quotations.module';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PdfRendererService } from './pdf-renderer.service';

@Module({
  imports: [QuotationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfRendererService],
  exports: [DocumentsService, PdfRendererService],
})
export class DocumentsModule {}
