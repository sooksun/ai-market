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
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CreateBudgetSourceSchema,
  UpdateBudgetSourceSchema,
  type CreateBudgetSourceInput,
  type UpdateBudgetSourceInput,
} from '@ai-market/shared';
import { BudgetSourcesService } from './budget-sources.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('budget-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class BudgetSourcesController {
  constructor(private budgets: BudgetSourcesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    return this.budgets.list(user, fiscalYear ? Number(fiscalYear) : undefined);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.budgets.getById(user, id);
  }

  @Roles('FINANCE', 'ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({ action: 'budget_source.create', entityType: 'BudgetSource' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateBudgetSourceSchema)) body: CreateBudgetSourceInput,
  ) {
    return this.budgets.create(user, body);
  }

  @Roles('FINANCE', 'ADMIN')
  @Patch(':id')
  @AuditAction({
    action: 'budget_source.update',
    entityType: 'BudgetSource',
    entityIdParam: 'id',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBudgetSourceSchema)) body: UpdateBudgetSourceInput,
  ) {
    return this.budgets.update(user, id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'budget_source.delete',
    entityType: 'BudgetSource',
    entityIdParam: 'id',
  })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.budgets.remove(user, id);
  }
}
