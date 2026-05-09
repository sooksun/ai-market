import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  RenderDocumentSchema,
  UpdateDocumentTemplateSchema,
  type RenderDocumentInput,
  type UpdateDocumentTemplateInput,
} from '@ai-market/shared';
import { DocumentsService } from './documents.service';
import { PdfRendererService } from './pdf-renderer.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class DocumentsController {
  constructor(
    private documents: DocumentsService,
    private pdf: PdfRendererService,
  ) {}

  @Get('document-templates')
  listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return this.documents.listTemplates(user);
  }

  @Get('document-templates/:id')
  getTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.documents.getTemplate(user, id);
  }

  @Roles('ADMIN')
  @Patch('document-templates/:id')
  @AuditAction({
    action: 'document_template.update',
    entityType: 'DocumentTemplate',
    entityIdParam: 'id',
  })
  updateTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDocumentTemplateSchema))
    body: UpdateDocumentTemplateInput,
  ) {
    return this.documents.updateTemplate(user, id, body);
  }

  @Get('purchase-requests/:prId/documents')
  listForPr(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
  ) {
    return this.documents.listForPr(user, prId);
  }

  @Post('purchase-requests/:prId/documents/render')
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({
    action: 'document.render',
    entityType: 'ProcurementDocument',
  })
  render(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(RenderDocumentSchema)) body: RenderDocumentInput,
  ) {
    return this.documents.renderForPr(user, prId, body.templateKey);
  }

  @Get('documents/:id')
  getDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documents.getDocument(user, id);
  }

  @Get('documents/:id/pdf')
  @Header('Cache-Control', 'no-store')
  @AuditAction({
    action: 'document.download_pdf',
    entityType: 'ProcurementDocument',
    entityIdParam: 'id',
  })
  async getDocumentPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const doc = await this.documents.getDocument(user, id);
    const buffer = await this.pdf.htmlToPdf(doc.renderedHtml, {
      headerTitle: `${doc.title}${doc.docNo ? ` · ${doc.docNo}` : ''}`,
      pageNumbers: true,
    });
    const safeFilename = (doc.docNo ?? doc.id).replace(/[^A-Za-z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}-${doc.templateKey}.pdf"`,
    );
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }
}
