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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  CreateRuleConfigSchema,
  UpdateRuleConfigSchema,
  type CreateRuleConfigInput,
  type UpdateRuleConfigInput,
} from '@ai-market/shared';
import { RuleConfigsService } from './rule-configs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('rule-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Roles('ADMIN')
export class RuleConfigsController {
  constructor(private rules: RuleConfigsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.rules.list(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.getById(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({ action: 'rule_config.create', entityType: 'RuleConfig' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateRuleConfigSchema)) body: CreateRuleConfigInput,
  ) {
    return this.rules.create(user, body);
  }

  @Patch(':id')
  @AuditAction({
    action: 'rule_config.update',
    entityType: 'RuleConfig',
    entityIdParam: 'id',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRuleConfigSchema)) body: UpdateRuleConfigInput,
  ) {
    return this.rules.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditAction({
    action: 'rule_config.delete',
    entityType: 'RuleConfig',
    entityIdParam: 'id',
  })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.remove(user, id);
  }
}
