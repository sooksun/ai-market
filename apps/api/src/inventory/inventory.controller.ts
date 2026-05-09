import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { StockOutInputSchema, type StockOutInput } from '@ai-market/shared';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
  ) {
    return this.inventory.list(user, { search });
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inventory.getById(user, id);
  }

  @Roles('PROCUREMENT', 'ADMIN')
  @Post(':id/issue-out')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'inventory.issue_out',
    entityType: 'InventoryItem',
    entityIdParam: 'id',
  })
  issueOut(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(StockOutInputSchema)) body: StockOutInput,
  ) {
    return this.inventory.issueOut(user, id, body);
  }
}
