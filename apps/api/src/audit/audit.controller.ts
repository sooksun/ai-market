import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  AuditScanInputSchema,
  AuditFlagsQuerySchema,
  type AuditScanInput,
  type AuditFlagsQuery,
} from '@ai-market/shared';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Roles('AUDITOR', 'DIRECTOR', 'PROCUREMENT', 'ADMIN')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Post('scan')
  @AuditAction({ action: 'audit.scan', entityType: 'AuditScan' })
  scan(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(AuditScanInputSchema)) body: AuditScanInput,
  ) {
    return this.audit.scan(user, body);
  }

  @Get('scans')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.audit.listScans(user);
  }

  @Get('scans/:id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.audit.getScan(user, id);
  }

  @Get('flags')
  flags(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(AuditFlagsQuerySchema)) query: AuditFlagsQuery,
  ) {
    return this.audit.listFlags(user, query);
  }
}
