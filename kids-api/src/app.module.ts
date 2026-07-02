import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { AlbumsModule } from "./albums/albums.module";
import { AnnouncementsModule } from "./announcements/announcements.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AuditModule } from "./audit/audit.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { UsageModule } from "./usage/usage.module";
import { LessonPlansModule } from "./lesson-plans/lesson-plans.module";
import { MenusModule } from "./menus/menus.module";
import { ClassroomsModule } from "./classrooms/classrooms.module";
import { DailyReportsModule } from "./daily-reports/daily-reports.module";
import { HealthModule } from "./health/health.module";
import { IncidentsModule } from "./incidents/incidents.module";
import { LeaveModule } from "./leave/leave.module";
import { MedicineModule } from "./medicine/medicine.module";
import { MediaModule } from "./media/media.module";
import { PickupModule } from "./pickup/pickup.module";
import { StudentsModule } from "./students/students.module";
import { TuitionModule } from "./tuition/tuition.module";
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
    NotificationsModule,
    AuditModule,
    UsageModule,
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
    HealthModule,
    MedicineModule,
    IncidentsModule,
    LeaveModule,
    PickupModule,
    AssignmentsModule,
    TuitionModule,
    AnnouncementsModule,
    MenusModule,
    LessonPlansModule,
    AlbumsModule,
    DashboardModule,
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
