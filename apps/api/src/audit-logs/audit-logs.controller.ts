import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogQuerySchema, type AuditLogQuery } from '@ai-market/shared';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('AUDITOR', 'DIRECTOR', 'ADMIN')
export class AuditLogsController {
  constructor(private logs: AuditLogsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(AuditLogQuerySchema)) query: AuditLogQuery,
  ) {
    return this.logs.list(user, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.logs.getById(user, id);
  }
}
