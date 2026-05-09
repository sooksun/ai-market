import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CancelVoucherSchema,
  IssueVoucherSchema,
  PayVoucherSchema,
  type CancelVoucherInput,
  type IssueVoucherInput,
  type PayVoucherInput,
} from '@ai-market/shared';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class FinanceController {
  constructor(private finance: FinanceService) {}

  @Get('purchase-requests/:prId/voucher')
  get(@CurrentUser() user: AuthenticatedUser, @Param('prId') prId: string) {
    return this.finance.getForPr(user, prId);
  }

  @Post('purchase-requests/:prId/voucher/ensure')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'voucher.ensure',
    entityType: 'FinanceVoucher',
    entityIdParam: 'prId',
  })
  ensure(@CurrentUser() user: AuthenticatedUser, @Param('prId') prId: string) {
    return this.finance.ensureForPr(user, prId);
  }

  @Post('purchase-requests/:prId/voucher/issue')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'voucher.issue',
    entityType: 'FinanceVoucher',
    entityIdParam: 'prId',
  })
  issue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(IssueVoucherSchema)) body: IssueVoucherInput,
  ) {
    return this.finance.issue(user, prId, body);
  }

  @Post('purchase-requests/:prId/voucher/pay')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'voucher.pay',
    entityType: 'FinanceVoucher',
    entityIdParam: 'prId',
  })
  pay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(PayVoucherSchema)) body: PayVoucherInput,
  ) {
    return this.finance.pay(user, prId, body);
  }

  @Post('purchase-requests/:prId/voucher/cancel')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'voucher.cancel',
    entityType: 'FinanceVoucher',
    entityIdParam: 'prId',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(CancelVoucherSchema)) body: CancelVoucherInput,
  ) {
    return this.finance.cancel(user, prId, body);
  }

  @Get('finance/inbox')
  inbox(@CurrentUser() user: AuthenticatedUser) {
    return this.finance.inbox(user);
  }
}
