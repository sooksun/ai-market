import { Controller, Get, UseGuards } from '@nestjs/common';
import { BudgetSourcesService } from './budget-sources.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('budget-sources')
@UseGuards(JwtAuthGuard)
export class BudgetSourcesController {
  constructor(private budgets: BudgetSourcesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.budgets.list(user);
  }
}
