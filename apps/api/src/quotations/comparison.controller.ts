import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ComparisonService } from './comparison.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('purchase-requests/:prId/comparison')
@UseGuards(JwtAuthGuard)
export class ComparisonController {
  constructor(private comparison: ComparisonService) {}

  @Get()
  build(@CurrentUser() user: AuthenticatedUser, @Param('prId') prId: string) {
    return this.comparison.build(user, prId);
  }
}
