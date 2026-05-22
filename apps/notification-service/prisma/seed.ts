import { PrismaPg } from '@prisma/adapter-pg';
import { NotificationType, PrismaClient } from '@prisma/notification-client';
import { DEMO_IDS, DEMO_USERS } from '../../../scripts/demo-seed-data';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed notification data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedNotification(input: {
  id: string;
  userId: string;
  title: string;
  body: string;
  data: object;
  isRead?: boolean;
  createdAt: Date;
}) {
  await prisma.notification.upsert({
    where: { id: input.id },
    update: {
      userId: input.userId,
      type: NotificationType.IN_APP,
      title: input.title,
      body: input.body,
      data: input.data,
      isRead: input.isRead ?? false,
      readAt: input.isRead ? input.createdAt : null,
      sentAt: input.createdAt,
      createdAt: input.createdAt,
    },
    create: {
      id: input.id,
      userId: input.userId,
      type: NotificationType.IN_APP,
      title: input.title,
      body: input.body,
      data: input.data,
      isRead: input.isRead ?? false,
      readAt: input.isRead ? input.createdAt : null,
      sentAt: input.createdAt,
      createdAt: input.createdAt,
    },
  });
}

async function main() {
  for (const student of DEMO_USERS.students) {
    await seedNotification({
      id: DEMO_IDS.notification(student.id, 'welcome'),
      userId: student.id,
      title: 'Chao mung ban den voi he thong on thi',
      body: `Ho so hoc vien ${student.licenseTier} da san sang cho demo.`,
      data: { kind: 'WELCOME', licenseTier: student.licenseTier },
      isRead: true,
      createdAt: new Date('2026-05-19T08:00:00.000Z'),
    });

    await seedNotification({
      id: DEMO_IDS.notification(student.id, 'exam-reminder'),
      userId: student.id,
      title: 'Nhac on tap ly thuyet',
      body: 'Hay hoan thanh bai luyen tap va xem lai nhom cau hoi thuong sai.',
      data: { kind: 'EXAM_REMINDER' },
      createdAt: new Date('2026-05-20T09:30:00.000Z'),
    });
  }

  const riskyStudent = DEMO_USERS.students.find(
    (student) => student.progressSeed === 'risk',
  );
  if (riskyStudent) {
    await prisma.academicWarning.upsert({
      where: { id: DEMO_IDS.warning(riskyStudent.id) },
      update: {
        studentId: riskyStudent.id,
        reason: 'LOW_EXAM_SCORE',
        severity: 'HIGH',
        message:
          'Can on lai nhom bien bao va tinh huong sa hinh truoc khi thi tiep.',
        createdById: DEMO_USERS.instructors[0].id,
      },
      create: {
        id: DEMO_IDS.warning(riskyStudent.id),
        studentId: riskyStudent.id,
        reason: 'LOW_EXAM_SCORE',
        severity: 'HIGH',
        message:
          'Can on lai nhom bien bao va tinh huong sa hinh truoc khi thi tiep.',
        createdById: DEMO_USERS.instructors[0].id,
      },
    });

    await seedNotification({
      id: DEMO_IDS.notification(riskyStudent.id, 'academic-warning'),
      userId: riskyStudent.id,
      title: 'Academic warning: HIGH',
      body: 'Can on lai nhom bien bao va tinh huong sa hinh truoc khi thi tiep.',
      data: {
        warningId: DEMO_IDS.warning(riskyStudent.id),
        reason: 'LOW_EXAM_SCORE',
        severity: 'HIGH',
      },
      createdAt: new Date('2026-05-21T07:30:00.000Z'),
    });
  }

  console.log(
    `Seeded notification_db: notifications for ${DEMO_USERS.students.length} students`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
