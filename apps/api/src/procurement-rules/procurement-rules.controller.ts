import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ProcurementRulesService } from './procurement-rules.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('purchase-requests/:prId/checklist')
@UseGuards(JwtAuthGuard)
export class ProcurementRulesController {
  constructor(private rules: ProcurementRulesService) {}

  @Get()
  evaluate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('prId') prId: string,
  ) {
    return this.rules.evaluateChecklist(user, prId);
  }
}
