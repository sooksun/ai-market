import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  @Roles('DIRECTOR', 'ADMIN')
  @Get('director')
  director(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.director(user);
  }

  @Roles('DIRECTOR', 'FINANCE', 'AUDITOR', 'ADMIN')
  @Get('financial')
  financial(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.financial(user);
  }

  @Roles('DIRECTOR', 'FINANCE', 'PROJECT_OWNER', 'AUDITOR', 'ADMIN')
  @Get('projects/:id')
  project(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.dashboard.projectDrilldown(user, id);
  }
}
