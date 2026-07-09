import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import { schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface ActivityInput {
  dayOfWeek: number;
  startTime?: string;
  title: string;
  materials?: string;
}
export interface CreateLessonPlanInput {
  classroomId: string;
  week: string;
  theme: string;
  note?: string;
  activities?: ActivityInput[];
}

@Injectable()
export class LessonPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, input: CreateLessonPlanInput) {
    const cls = await this.prisma.db.classroom.findFirst({
      where: { id: input.classroomId, ...schoolWhere(user) },
      select: { schoolId: true },
    });
    if (!cls) throw new NotFoundException({ code: "NO_CLASSROOM", message: "Không tìm thấy lớp" });

    return this.prisma.db.lessonPlan.create({
      data: {
        schoolId: cls.schoolId,
        classroomId: input.classroomId,
        week: input.week,
        theme: input.theme,
        note: input.note,
        authorId: user.id,
        activities: input.activities?.length
          ? {
              create: input.activities.map((a) => ({
                tenantId: user.tenantId!,
                dayOfWeek: a.dayOfWeek,
                startTime: a.startTime,
                title: a.title,
                materials: a.materials,
              })),
            }
          : undefined,
      } as never,
      include: { activities: { orderBy: { dayOfWeek: "asc" } } },
    });
  }

  async list(user: AuthUser, opts: PaginationQuery & { classroomId?: string; week?: string } = {}) {
    const pg = page(opts);
    const where = {
      ...schoolWhere(user),
      ...(opts.classroomId ? { classroomId: opts.classroomId } : {}),
      ...(opts.week ? { week: opts.week } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.db.lessonPlan.findMany({
        where,
        include: { classroom: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.lessonPlan.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  async get(user: AuthUser, id: string) {
    const plan = await this.prisma.db.lessonPlan.findFirst({
      where: { id, ...schoolWhere(user) },
      include: {
        classroom: { select: { id: true, name: true } },
        activities: { orderBy: { dayOfWeek: "asc" } },
      },
    });
    if (!plan)
      throw new NotFoundException({ code: "NO_LESSON_PLAN", message: "Không tìm thấy giáo án" });
    return plan;
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.prisma.db.lessonPlan.delete({ where: { id } });
    return { ok: true };
  }
}
