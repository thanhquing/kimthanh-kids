import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { code: 'KT01' },
    update: {},
    create: {
      code: 'KT01',
      name: 'KimThanh Kindergarten — Main Campus',
      address: '123 Sample Street, District 1, Ho Chi Minh City',
      phone: '+84 28 0000 0000',
      email: 'hello@kimthanh.school',
    },
  });

  const passwordHash = await bcrypt.hash('Password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@kimthanh.school' },
    update: {},
    create: {
      email: 'admin@kimthanh.school',
      passwordHash,
      fullName: 'System Administrator',
      role: UserRole.SUPER_ADMIN,
      schoolId: school.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'teacher@kimthanh.school' },
    update: {},
    create: {
      email: 'teacher@kimthanh.school',
      passwordHash,
      fullName: 'Demo Teacher',
      role: UserRole.TEACHER,
      schoolId: school.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'parent@kimthanh.school' },
    update: {},
    create: {
      email: 'parent@kimthanh.school',
      passwordHash,
      fullName: 'Demo Parent',
      role: UserRole.PARENT,
      schoolId: school.id,
    },
  });

  console.warn('Seed completed for school', school.code);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
