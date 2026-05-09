import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { PrModule } from './purchase-requests/pr.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { ExportsModule } from './exports/exports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProjectsModule } from './projects/projects.module';
import { BudgetSourcesModule } from './budget-sources/budget-sources.module';
import { BudgetsModule } from './budgets/budgets.module';
import { RuleConfigsModule } from './rule-configs/rule-configs.module';
import { VendorsModule } from './vendors/vendors.module';
import { QuotationsModule } from './quotations/quotations.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    AiModule,
    PrModule,
    AuditLogsModule,
    ExportsModule,
    DashboardModule,
    ProjectsModule,
    BudgetSourcesModule,
    BudgetsModule,
    RuleConfigsModule,
    VendorsModule,
    QuotationsModule,
    ApprovalsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
