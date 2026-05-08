import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ParseItemsInputSchema,
  CheckCloudinessInputSchema,
  SpecWriterInputSchema,
  type ParseItemsInput,
  type CheckCloudinessInput,
  type SpecWriterInput,
} from '@ai-market/shared';
import { ParseItemsService } from './services/parse-items.service';
import { CloudinessService } from './services/cloudiness.service';
import { FileParserService } from './services/file-parser.service';
import { SpecWriterService } from './services/spec-writer.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AiController {
  constructor(
    private parseItems: ParseItemsService,
    private cloudiness: CloudinessService,
    private fileParser: FileParserService,
    private specWriter: SpecWriterService,
  ) {}

  @Post('parse-items')
  @AuditAction({ action: 'ai.parse_items', entityType: 'AiInvocation' })
  parse(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(ParseItemsInputSchema)) body: ParseItemsInput,
  ) {
    return this.parseItems.parse(user, body);
  }

  @Post('parse-items/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @AuditAction({ action: 'ai.parse_items_upload', entityType: 'AiInvocation' })
  async parseUpload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('hint') hint?: string,
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'ต้องแนบไฟล์ใน field "file"',
      });
    }
    const parsed = await this.fileParser.parse(file);
    return this.parseItems.parse(user, {
      type: parsed.type,
      content: parsed.content,
      sourceFilename: file.originalname,
      hint: hint && hint.length <= 500 ? hint : undefined,
    });
  }

  @Roles('PROCUREMENT', 'DIRECTOR', 'ADMIN')
  @Post('check-cloudiness')
  @AuditAction({ action: 'ai.check_cloudiness', entityType: 'PurchaseRequest' })
  checkCloudiness(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CheckCloudinessInputSchema)) body: CheckCloudinessInput,
  ) {
    return this.cloudiness.check(user, body.purchaseRequestId);
  }

  @Post('spec-writer')
  @AuditAction({ action: 'ai.spec_writer', entityType: 'PurchaseRequestItem' })
  specWriterRewrite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(SpecWriterInputSchema)) body: SpecWriterInput,
  ) {
    return this.specWriter.rewrite(user, body.itemId, body.tone, body.rawSpec);
  }
}
