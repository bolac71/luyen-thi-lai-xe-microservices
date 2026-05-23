import { PrismaPg } from '@prisma/adapter-pg';
import {
  LicenseCategory,
  PrismaClient,
  SimulationSessionStatus,
} from '@prisma/simulation-client';
import { DEMO_IDS, DEMO_USERS } from '../../../scripts/demo-seed-data';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed simulation data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const maneuvers = [
  {
    slug: 'start',
    title: 'Xuat phat',
    description:
      'Thuc hanh quy trinh xuat phat dung ky thuat trong bai sa hinh.',
    checkpoints: [
      [
        'Chuan bi truoc vach',
        'Dung xe dung vi tri, that day an toan va kiem tra guong.',
        'Tru diem neu khong that day an toan.',
      ],
      [
        'Bat tin hieu',
        'Bat den xi nhan trai truoc khi khoi hanh.',
        'Tru diem neu bat tin hieu sai thoi diem.',
      ],
      [
        'Khoi hanh em',
        'Nha con va tang ga on dinh, khong de xe chet may.',
        'Tru diem neu chet may hoac rung giat manh.',
      ],
    ],
  },
  {
    slug: 'pedestrian-stop',
    title: 'Dung xe nhuong duong nguoi di bo',
    description: 'Dung xe dung vach va khoi hanh lai an toan.',
    checkpoints: [
      [
        'Giam toc som',
        'Giam toc truoc vach dung, giu khoang cach an toan.',
        'Tru diem neu phanh gap.',
      ],
      [
        'Dung dung vi tri',
        'Banh truoc khong de len vach nguoi di bo.',
        'Tru diem neu de xe qua vach.',
      ],
      [
        'Khoi hanh lai',
        'Quan sat hai ben truoc khi di tiep.',
        'Tru diem neu khong quan sat.',
      ],
    ],
  },
  {
    slug: 'hill-start',
    title: 'Dung va khoi hanh ngang doc',
    description: 'Kiem soat phanh, con va ga khi khoi hanh tren doc.',
    checkpoints: [
      [
        'Dung tren doc',
        'Dung xe trong vung quy dinh va giu xe on dinh.',
        'Tru diem neu xe troi.',
      ],
      [
        'Phoi hop phanh con ga',
        'Nha phanh dung luc, tang ga vua du.',
        'Loai neu troi qua gioi han.',
      ],
      [
        'Ra khoi doc',
        'Tang toc nhe va giu huong xe thang.',
        'Tru diem neu chet may.',
      ],
    ],
  },
  {
    slug: 'narrow-track',
    title: 'Qua vet banh xe va duong hep vuong goc',
    description: 'Canh chinh banh xe dung vet va dieu khien qua duong hep.',
    checkpoints: [
      [
        'Canh vet banh',
        'Canh guong va mui xe truoc khi vao vet banh.',
        'Tru diem neu lech vet.',
      ],
      [
        'Giu toc do cham',
        'Di deu ga, khong danh lai dot ngot.',
        'Tru diem neu cham vach.',
      ],
      [
        'Ra khoi bai',
        'Tra lai thang va quan sat huong tiep theo.',
        'Tru diem neu mat huong xe.',
      ],
    ],
  },
  {
    slug: 'traffic-light',
    title: 'Qua nga tu co tin hieu',
    description: 'Chap hanh den tin hieu va giu lan duong.',
    checkpoints: [
      [
        'Quan sat den',
        'Nhan dien tin hieu tu xa va chuan bi toc do phu hop.',
        'Tru diem neu vuot den do.',
      ],
      ['Giu lan', 'Di dung lan khi qua nga tu.', 'Tru diem neu lan vach.'],
      [
        'Thoat nga tu',
        'Tang toc sau khi qua vung giao cat.',
        'Tru diem neu dung sai vi tri.',
      ],
    ],
  },
  {
    slug: 'parallel-park',
    title: 'Ghep xe doc',
    description: 'Thuc hien ghep xe vao noi do doc dung kich thuoc.',
    checkpoints: [
      [
        'Chon moc canh',
        'Dung xe song song va canh moc bat dau.',
        'Tru diem neu qua moc.',
      ],
      [
        'Lui vao chuong',
        'Danh lai va lui cham theo dung quy dao.',
        'Tru diem neu cham vach.',
      ],
      [
        'Chinh xe',
        'Tra lai va can xe nam trong chuong.',
        'Loai neu de xe ngoai khu vuc.',
      ],
    ],
  },
];

const errors = [
  ['SA-HINH-001', 'Khong that day an toan truoc khi xuat phat.', 'MAJOR'],
  ['SA-HINH-002', 'De xe chet may trong bai thi.', 'MAJOR'],
  ['SA-HINH-003', 'Vuot qua vach dung quy dinh.', 'CRITICAL'],
  ['SA-HINH-004', 'Khong bat tin hieu khi can chuyen huong.', 'MINOR'],
  ['SA-HINH-005', 'Cham vach hoac lech vet banh xe.', 'MAJOR'],
  ['SA-HINH-006', 'Khong quan sat truoc khi khoi hanh lai.', 'MINOR'],
];

async function seedManeuverForCategory(
  maneuver: (typeof maneuvers)[number],
  licenseCategory: LicenseCategory,
  displayOrder: number,
) {
  const slug = `${licenseCategory.toLowerCase()}-${maneuver.slug}`;
  const id = DEMO_IDS.maneuver(slug);

  await prisma.maneuver.upsert({
    where: { id },
    update: {
      title: maneuver.title,
      description: maneuver.description,
      licenseCategory,
      displayOrder,
      isActive: true,
    },
    create: {
      id,
      title: maneuver.title,
      description: maneuver.description,
      licenseCategory,
      displayOrder,
    },
  });

  for (const [index, checkpoint] of maneuver.checkpoints.entries()) {
    await prisma.maneuverCheckpoint.upsert({
      where: { id: DEMO_IDS.checkpoint(slug, index + 1) },
      update: {
        title: checkpoint[0],
        instruction: checkpoint[1],
        penalty: checkpoint[2],
        displayOrder: index + 1,
      },
      create: {
        id: DEMO_IDS.checkpoint(slug, index + 1),
        maneuverId: id,
        title: checkpoint[0],
        instruction: checkpoint[1],
        penalty: checkpoint[2],
        displayOrder: index + 1,
      },
    });
  }
}

async function main() {
  for (const category of [LicenseCategory.B1, LicenseCategory.B2]) {
    for (const [index, maneuver] of maneuvers.entries()) {
      await seedManeuverForCategory(maneuver, category, index + 1);
    }

    for (const [code, description, severity] of errors) {
      const errorCode = `${category}-${code}`;
      await prisma.maneuverError.upsert({
        where: { id: DEMO_IDS.maneuverError(category, errorCode) },
        update: {
          licenseCategory: category,
          code: errorCode,
          description,
          severity,
        },
        create: {
          id: DEMO_IDS.maneuverError(category, errorCode),
          licenseCategory: category,
          code: errorCode,
          description,
          severity,
        },
      });
    }
  }

  const student = DEMO_USERS.students.find((item) => item.licenseTier === 'B1');
  if (student) {
    const sessionId = DEMO_IDS.simulationSession(student.id, 'completed-b1');
    await prisma.simulationSession.upsert({
      where: { id: sessionId },
      update: {
        status: SimulationSessionStatus.COMPLETED,
        totalScenarios: 3,
        correctCount: 3,
        score: 100,
        isPassed: true,
        completedAt: new Date('2026-05-21T09:00:00.000Z'),
      },
      create: {
        id: sessionId,
        studentId: student.id,
        licenseCategory: LicenseCategory.B1,
        status: SimulationSessionStatus.COMPLETED,
        totalScenarios: 3,
        correctCount: 3,
        score: 100,
        isPassed: true,
        startedAt: new Date('2026-05-21T08:45:00.000Z'),
        completedAt: new Date('2026-05-21T09:00:00.000Z'),
      },
    });

    for (let index = 1; index <= 3; index += 1) {
      const scenarioId = DEMO_IDS.checkpoint('b1-start', index);
      await prisma.simulationAnswer.upsert({
        where: { sessionId_scenarioId: { sessionId, scenarioId } },
        update: {
          selectedOptionId: `demo-option-${index}`,
          isCorrect: true,
          answeredAt: new Date('2026-05-21T08:50:00.000Z'),
        },
        create: {
          id: DEMO_IDS.simulationAnswer(sessionId, scenarioId),
          sessionId,
          scenarioId,
          selectedOptionId: `demo-option-${index}`,
          isCorrect: true,
          answeredAt: new Date('2026-05-21T08:50:00.000Z'),
        },
      });
    }
  }

  console.log(
    `Seeded simulation_db: ${maneuvers.length * 2} maneuvers, ${errors.length * 2} errors`,
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
