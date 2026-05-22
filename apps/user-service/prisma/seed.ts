import { PrismaPg } from '@prisma/adapter-pg';
import { Gender, LicenseTier, PrismaClient, Role } from '@prisma/user-client';
import {
  DEMO_IDS,
  DEMO_USERS,
  allDemoUsers,
} from '../../../scripts/demo-seed-data';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed user data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const studentLicenseById = new Map(
  DEMO_USERS.students.map((student) => [student.id, student.licenseTier]),
);

async function main() {
  for (const user of allDemoUsers()) {
    await prisma.userProfile.upsert({
      where: { id: user.id },
      update: {
        fullName: user.fullName,
        email: user.email,
        role: user.role as Role,
        isActive: true,
      },
      create: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role as Role,
        gender: Gender.OTHER,
        address: 'Demo driving center',
      },
    });

    const licenseTier = studentLicenseById.get(user.id);
    if (!licenseTier) continue;

    await prisma.studentDetail.upsert({
      where: { studentId: user.id },
      update: {
        licenseTier: licenseTier as LicenseTier,
        enrolledAt: new Date('2026-05-01T00:00:00.000Z'),
        notes: 'Seeded demo student',
      },
      create: {
        studentId: user.id,
        licenseTier: licenseTier as LicenseTier,
        enrolledAt: new Date('2026-05-01T00:00:00.000Z'),
        notes: 'Seeded demo student',
      },
    });

    await prisma.licenseAssignmentAudit.upsert({
      where: { id: DEMO_IDS.notification(user.id, 'license-audit') },
      update: {
        oldLicenseTier: null,
        newLicenseTier: licenseTier as LicenseTier,
        changedById: DEMO_USERS.admin.id,
      },
      create: {
        id: DEMO_IDS.notification(user.id, 'license-audit'),
        studentId: user.id,
        oldLicenseTier: null,
        newLicenseTier: licenseTier as LicenseTier,
        changedById: DEMO_USERS.admin.id,
      },
    });
  }

  console.log(
    `Seeded user_db: ${allDemoUsers().length} profiles, ${DEMO_USERS.students.length} student details`,
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
