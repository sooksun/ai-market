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
  AllocateBudgetSchema,
  UpdateBudgetAllocationSchema,
  type AllocateBudgetInput,
  type UpdateBudgetAllocationInput,
} from '@ai-market/shared';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('budgets')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class BudgetsController {
  constructor(private budgets: BudgetsService) {}

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
  @AuditAction({ action: 'budget.allocate', entityType: 'Budget' })
  allocate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AllocateBudgetSchema)) body: AllocateBudgetInput,
  ) {
    return this.budgets.allocate(user, body);
  }

  @Roles('FINANCE', 'ADMIN')
  @Patch(':id')
  @AuditAction({ action: 'budget.update', entityType: 'Budget', entityIdParam: 'id' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBudgetAllocationSchema))
    body: UpdateBudgetAllocationInput,
  ) {
    return this.budgets.updateAllocation(user, id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditAction({ action: 'budget.delete', entityType: 'Budget', entityIdParam: 'id' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.budgets.deleteAllocation(user, id);
  }
}
