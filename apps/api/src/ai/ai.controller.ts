import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ParseItemsInputSchema,
  CheckCloudinessInputSchema,
  type ParseItemsInput,
  type CheckCloudinessInput,
} from '@ai-market/shared';
import { ParseItemsService } from './services/parse-items.service';
import { CloudinessService } from './services/cloudiness.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class AiController {
  constructor(
    private parseItems: ParseItemsService,
    private cloudiness: CloudinessService,
  ) {}

  @Post('parse-items')
  @AuditAction({ action: 'ai.parse_items', entityType: 'AiInvocation' })
  parse(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(ParseItemsInputSchema)) body: ParseItemsInput,
  ) {
    return this.parseItems.parse(user, body);
  }

  @Roles('PROCUREMENT', 'DIRECTOR', 'ADMIN')
  @Post('check-cloudiness')
  @AuditAction({ action: 'ai.check_cloudiness', entityType: 'PurchaseRequest' })
  checkCloudiness(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CheckCloudinessInputSchema)) body: CheckCloudinessInput,
  ) {
    return this.cloudiness.check(user, body.purchaseRequestId);
  }
}
