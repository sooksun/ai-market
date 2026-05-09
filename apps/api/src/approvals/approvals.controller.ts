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
  ApprovalDecisionSchema,
  ApprovalRejectSchema,
  ApprovalReturnSchema,
  type ApprovalDecisionInput,
  type ApprovalRejectInput,
  type ApprovalReturnInput,
} from '@ai-market/shared';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class ApprovalsController {
  constructor(private approvals: ApprovalsService) {}

  @Get('purchase-requests/:prId/approval')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
  ) {
    return this.approvals.getForPr(user, prId);
  }

  @Post('purchase-requests/:prId/approval/approve')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'approval.approve',
    entityType: 'ApprovalWorkflow',
    entityIdParam: 'prId',
  })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(ApprovalDecisionSchema)) body: ApprovalDecisionInput,
  ) {
    return this.approvals.approve(user, prId, body.comment ?? null);
  }

  @Post('purchase-requests/:prId/approval/reject')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'approval.reject',
    entityType: 'ApprovalWorkflow',
    entityIdParam: 'prId',
  })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(ApprovalRejectSchema)) body: ApprovalRejectInput,
  ) {
    return this.approvals.reject(user, prId, body.comment);
  }

  @Post('purchase-requests/:prId/approval/return')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'approval.return',
    entityType: 'ApprovalWorkflow',
    entityIdParam: 'prId',
  })
  returnToRequester(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(ApprovalReturnSchema)) body: ApprovalReturnInput,
  ) {
    return this.approvals.returnToRequester(user, prId, body.comment);
  }

  @Get('approvals/inbox')
  inbox(@CurrentUser() user: AuthenticatedUser) {
    return this.approvals.inboxForUser(user);
  }
}
