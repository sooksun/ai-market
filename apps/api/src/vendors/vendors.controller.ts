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
  CreateVendorSchema,
  UpdateVendorSchema,
  type CreateVendorInput,
  type UpdateVendorInput,
} from '@ai-market/shared';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { AuditInterceptor } from '../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
export class VendorsController {
  constructor(private vendors: VendorsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.vendors.list(user, includeInactive === 'true');
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.vendors.getById(user, id);
  }

  @Roles('PROCUREMENT', 'ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditAction({ action: 'vendor.create', entityType: 'Vendor' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateVendorSchema)) body: CreateVendorInput,
  ) {
    return this.vendors.create(user, body);
  }

  @Roles('PROCUREMENT', 'ADMIN')
  @Patch(':id')
  @AuditAction({ action: 'vendor.update', entityType: 'Vendor', entityIdParam: 'id' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVendorSchema)) body: UpdateVendorInput,
  ) {
    return this.vendors.update(user, id, body);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditAction({ action: 'vendor.delete', entityType: 'Vendor', entityIdParam: 'id' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.vendors.remove(user, id);
  }
}
