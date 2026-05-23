import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/analytics-client';
import {
  DEMO_IDS,
  DEMO_TOPIC_IDS,
  DEMO_TOPIC_NAMES,
  DEMO_USERS,
  deterministicUuid,
} from '../../../scripts/demo-seed-data';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed analytics data');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const profilePresets = {
  active: {
    study: 90,
    attempts: 2,
    passed: 1,
    avg: 78,
    enrolled: 1,
    completed: 0,
  },
  strong: {
    study: 180,
    attempts: 4,
    passed: 3,
    avg: 86,
    enrolled: 1,
    completed: 0,
  },
  risk: {
    study: 70,
    attempts: 3,
    passed: 0,
    avg: 58,
    enrolled: 1,
    completed: 0,
  },
  completed: {
    study: 240,
    attempts: 5,
    passed: 4,
    avg: 88,
    enrolled: 1,
    completed: 1,
  },
  new: { study: 20, attempts: 0, passed: 0, avg: 0, enrolled: 1, completed: 0 },
};

function utcDate(day: number): Date {
  return new Date(Date.UTC(2026, 4, day));
}

async function seedDailyActivity(
  studentId: string,
  preset: keyof typeof profilePresets,
) {
  const base = profilePresets[preset];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = 15 + offset;
    const date = utcDate(day);
    const examsAttempted = base.attempts > 0 && offset % 3 === 0 ? 1 : 0;
    const questionsAnswered = examsAttempted ? 30 : 0;
    const correctAnswers =
      examsAttempted && base.avg > 0
        ? Math.round((base.avg / 100) * questionsAnswered)
        : 0;

    await prisma.dailyActivity.upsert({
      where: { studentId_date: { studentId, date } },
      update: {
        studyMinutes: Math.max(5, Math.round(base.study / 7) + offset),
        examsAttempted,
        questionsAnswered,
        correctAnswers,
      },
      create: {
        id: DEMO_IDS.analyticsActivity(
          studentId,
          date.toISOString().slice(0, 10),
        ),
        studentId,
        date,
        studyMinutes: Math.max(5, Math.round(base.study / 7) + offset),
        examsAttempted,
        questionsAnswered,
        correctAnswers,
      },
    });
  }
}

async function seedWeakTopics(
  studentId: string,
  preset: keyof typeof profilePresets,
) {
  if (preset === 'new') return;

  for (let index = 0; index < 4; index += 1) {
    const questionId = deterministicUuid(`bca-600-question-${301 + index}`);
    const totalAttempts = preset === 'risk' ? 5 + index : 3 + index;
    const correctAttempts =
      preset === 'risk' ? 1 : Math.max(1, totalAttempts - 2);

    await prisma.questionAccuracyTracker.upsert({
      where: { studentId_questionId: { studentId, questionId } },
      update: {
        topicId: DEMO_TOPIC_IDS[(index + 4) % DEMO_TOPIC_IDS.length],
        topicName: DEMO_TOPIC_NAMES[(index + 4) % DEMO_TOPIC_NAMES.length],
        totalAttempts,
        correctAttempts,
        lastAttemptAt: new Date('2026-05-21T08:00:00.000Z'),
      },
      create: {
        id: DEMO_IDS.accuracy(studentId, questionId),
        studentId,
        questionId,
        topicId: DEMO_TOPIC_IDS[(index + 4) % DEMO_TOPIC_IDS.length],
        topicName: DEMO_TOPIC_NAMES[(index + 4) % DEMO_TOPIC_NAMES.length],
        totalAttempts,
        correctAttempts,
        lastAttemptAt: new Date('2026-05-21T08:00:00.000Z'),
      },
    });
  }
}

async function main() {
  for (const student of DEMO_USERS.students) {
    const preset = student.progressSeed as keyof typeof profilePresets;
    const profile = profilePresets[preset];

    await prisma.studentLearningProfile.upsert({
      where: { studentId: student.id },
      update: {
        totalStudyMinutes: profile.study,
        totalExamAttempts: profile.attempts,
        passedExams: profile.passed,
        avgExamScore: profile.avg,
        coursesEnrolled: profile.enrolled,
        coursesCompleted: profile.completed,
        lastActivityAt: new Date('2026-05-21T08:30:00.000Z'),
      },
      create: {
        id: student.id,
        studentId: student.id,
        totalStudyMinutes: profile.study,
        totalExamAttempts: profile.attempts,
        passedExams: profile.passed,
        avgExamScore: profile.avg,
        coursesEnrolled: profile.enrolled,
        coursesCompleted: profile.completed,
        lastActivityAt: new Date('2026-05-21T08:30:00.000Z'),
      },
    });

    await seedDailyActivity(student.id, preset);
    await seedWeakTopics(student.id, preset);
  }

  console.log(
    `Seeded analytics_db: ${DEMO_USERS.students.length} learning profiles`,
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
