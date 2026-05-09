import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FinalizeReceivingSchema,
  RecordReceivingItemSchema,
  type FinalizeReceivingInput,
  type RecordReceivingItemInput,
} from '@ai-market/shared';
import { ReceivingsService } from './receivings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ReceivingsController {
  constructor(private receivings: ReceivingsService) {}

  @Get('purchase-requests/:prId/receiving')
  get(@CurrentUser() user: AuthenticatedUser, @Param('prId') prId: string) {
    return this.receivings.getForPr(user, prId);
  }

  @Post('purchase-requests/:prId/receiving/start')
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({
    action: 'receiving.start',
    entityType: 'ReceivingRecord',
    entityIdParam: 'prId',
  })
  start(@CurrentUser() user: AuthenticatedUser, @Param('prId') prId: string) {
    return this.receivings.start(user, prId);
  }

  @Patch('purchase-requests/:prId/receiving/items/:itemId')
  @AuditAction({
    action: 'receiving.record_item',
    entityType: 'ReceivingItem',
    entityIdParam: 'itemId',
  })
  recordItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(RecordReceivingItemSchema))
    body: RecordReceivingItemInput,
  ) {
    return this.receivings.recordItem(user, prId, itemId, body);
  }

  @Post('purchase-requests/:prId/receiving/finalize')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'receiving.finalize',
    entityType: 'ReceivingRecord',
    entityIdParam: 'prId',
  })
  finalize(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(FinalizeReceivingSchema)) body: FinalizeReceivingInput,
  ) {
    return this.receivings.finalize(user, prId, body);
  }

  @Get('receivings/inbox')
  inbox(@CurrentUser() user: AuthenticatedUser) {
    return this.receivings.inboxForUser(user);
  }
}
