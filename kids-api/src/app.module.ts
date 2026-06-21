import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { ClassroomsModule } from "./classrooms/classrooms.module";
import { DailyReportsModule } from "./daily-reports/daily-reports.module";
import { MediaModule } from "./media/media.module";
import { StudentsModule } from "./students/students.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { SubscriptionGuard } from "./common/guards/subscription.guard";
import { TenantGuard } from "./common/guards/tenant.guard";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AppConfigModule } from "./config/config.module";
import { EntitlementModule } from "./entitlement/entitlement.module";
import { PlatformModule } from "./platform/platform.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProvisioningModule } from "./provisioning/provisioning.module";
import { TenantModule } from "./tenant/tenant.module";
import { TenantResolutionMiddleware } from "./tenancy/tenant-resolution.middleware";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    EntitlementModule,
    AuthModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ProvisioningModule,
    BillingModule,
    PlatformModule,
    TenantModule,
    ClassroomsModule,
    StudentsModule,
    AttendanceModule,
    DailyReportsModule,
    MediaModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Guard chain — thứ tự khớp plan: Throttler → Jwt → Tenant → Subscription → Roles.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantResolutionMiddleware).forRoutes("*");
  }
}
