import {
  Body,
  Controller,
  Delete,
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
  CreateQuotationSchema,
  UpdateQuotationSchema,
  SelectQuotationSchema,
  type CreateQuotationInput,
  type UpdateQuotationInput,
  type SelectQuotationInput,
} from '@ai-market/shared';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('purchase-requests/:prId/quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class QuotationsController {
  constructor(private quotations: QuotationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('prId') prId: string) {
    return this.quotations.listForPr(user, prId);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Param('id') id: string,
  ) {
    return this.quotations.getById(user, prId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({ action: 'quotation.create', entityType: 'VendorQuotation' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Body(new ZodValidationPipe(CreateQuotationSchema)) body: CreateQuotationInput,
  ) {
    return this.quotations.create(user, prId, body);
  }

  @Patch(':id')
  @AuditAction({
    action: 'quotation.update',
    entityType: 'VendorQuotation',
    entityIdParam: 'id',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateQuotationSchema)) body: UpdateQuotationInput,
  ) {
    return this.quotations.update(user, prId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'quotation.withdraw',
    entityType: 'VendorQuotation',
    entityIdParam: 'id',
  })
  withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Param('id') id: string,
  ) {
    return this.quotations.withdraw(user, prId, id);
  }

  @Post(':id/select')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'quotation.select',
    entityType: 'VendorQuotation',
    entityIdParam: 'id',
  })
  select(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SelectQuotationSchema)) body: SelectQuotationInput,
  ) {
    return this.quotations.select(user, prId, id, body.reason);
  }
}
