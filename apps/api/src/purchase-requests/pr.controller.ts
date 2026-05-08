import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApplySpecificationsSchema,
  CreatePurchaseRequestSchema,
  UpdatePurchaseRequestSchema,
  ReturnPurchaseRequestSchema,
  DismissRiskFlagSchema,
  type ApplySpecificationsInput,
  type CreatePurchaseRequestInput,
  type UpdatePurchaseRequestInput,
  type ReturnPurchaseRequestInput,
  type DismissRiskFlagInput,
} from '@ai-market/shared';
import { PrService } from './pr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class PrController {
  constructor(private pr: PrService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('requesterId') requesterId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.pr.list(user, {
      status,
      q,
      requesterId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pr.getById(user, id);
  }

  @Roles('REQUESTER', 'ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({ action: 'purchase_request.create', entityType: 'PurchaseRequest' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreatePurchaseRequestSchema)) body: CreatePurchaseRequestInput,
  ) {
    return this.pr.create(user, body);
  }

  @Patch(':id')
  @AuditAction({
    action: 'purchase_request.update',
    entityType: 'PurchaseRequest',
    entityIdParam: 'id',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePurchaseRequestSchema)) body: UpdatePurchaseRequestInput,
  ) {
    return this.pr.update(user, id, body);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'purchase_request.submit',
    entityType: 'PurchaseRequest',
    entityIdParam: 'id',
  })
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pr.submit(user, id);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'purchase_request.withdraw',
    entityType: 'PurchaseRequest',
    entityIdParam: 'id',
  })
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pr.withdraw(user, id);
  }

  @Roles('PROCUREMENT', 'ADMIN')
  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'purchase_request.claim',
    entityType: 'PurchaseRequest',
    entityIdParam: 'id',
  })
  claim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pr.claim(user, id);
  }

  @Roles('PROCUREMENT', 'ADMIN')
  @Post(':id/return')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'purchase_request.return',
    entityType: 'PurchaseRequest',
    entityIdParam: 'id',
  })
  returnForRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ReturnPurchaseRequestSchema)) body: ReturnPurchaseRequestInput,
  ) {
    return this.pr.returnForRevision(user, id, body.reason);
  }

  @Roles('PROCUREMENT', 'ADMIN')
  @Post(':id/approve-for-comparison')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'purchase_request.approve_for_comparison',
    entityType: 'PurchaseRequest',
    entityIdParam: 'id',
  })
  approveForComparison(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pr.approveForComparison(user, id);
  }

  @Post(':id/items/:itemId/specifications')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'purchase_request.apply_specifications',
    entityType: 'PurchaseRequestItem',
    entityIdParam: 'itemId',
  })
  applyItemSpecifications(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(ApplySpecificationsSchema))
    body: ApplySpecificationsInput,
  ) {
    return this.pr.applyItemSpecifications(user, id, itemId, body);
  }

  @Roles('PROCUREMENT', 'DIRECTOR', 'ADMIN')
  @Post(':id/risk-flags/:flagId/dismiss')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'purchase_request.dismiss_risk_flag',
    entityType: 'AiRiskFlag',
    entityIdParam: 'flagId',
  })
  dismissRiskFlag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('flagId') flagId: string,
    @Body(new ZodValidationPipe(DismissRiskFlagSchema)) body: DismissRiskFlagInput,
  ) {
    return this.pr.dismissRiskFlag(user, id, flagId, body.reason);
  }
}
