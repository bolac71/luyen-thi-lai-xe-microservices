import { Injectable } from '@nestjs/common';
import {
  ExamCompletedPayload,
  LearningProgressRepository,
  ProgressDashboard,
} from '../../../domain/repositories/learning-progress.repository';
import { PrismaService } from './prisma.service';

function toDateOnly(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

@Injectable()
export class PrismaLearningProgressRepository extends LearningProgressRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async ensureStudent(studentId: string): Promise<void> {
    await this.prisma.studentLearningProfile.upsert({
      where: { studentId },
      create: { id: studentId, studentId },
      update: {},
    });
  }

  async recordExamCompleted(payload: ExamCompletedPayload): Promise<void> {
    const occurredAt = payload.occurredAt
      ? new Date(payload.occurredAt)
      : new Date();
    const date = toDateOnly(occurredAt);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.studentLearningProfile.findUnique({
        where: { studentId: payload.studentId },
      });
      const attempts = existing?.totalExamAttempts ?? 0;
      const avg =
        attempts === 0
          ? payload.score
          : ((existing?.avgExamScore ?? 0) * attempts + payload.score) /
            (attempts + 1);

      await tx.studentLearningProfile.upsert({
        where: { studentId: payload.studentId },
        create: {
          id: payload.studentId,
          studentId: payload.studentId,
          totalExamAttempts: 1,
          passedExams: payload.isPassed ? 1 : 0,
          avgExamScore: avg,
          lastActivityAt: occurredAt,
        },
        update: {
          totalExamAttempts: { increment: 1 },
          passedExams: { increment: payload.isPassed ? 1 : 0 },
          avgExamScore: avg,
          lastActivityAt: occurredAt,
        },
      });

      await tx.dailyActivity.upsert({
        where: { studentId_date: { studentId: payload.studentId, date } },
        create: {
          studentId: payload.studentId,
          date,
          examsAttempted: 1,
          questionsAnswered: payload.questions?.length ?? 0,
          correctAnswers:
            payload.questions?.filter((item) => item.isCorrect).length ?? 0,
        },
        update: {
          examsAttempted: { increment: 1 },
          questionsAnswered: { increment: payload.questions?.length ?? 0 },
          correctAnswers: {
            increment:
              payload.questions?.filter((item) => item.isCorrect).length ?? 0,
          },
        },
      });

      for (const question of payload.questions ?? []) {
        await tx.questionAccuracyTracker.upsert({
          where: {
            studentId_questionId: {
              studentId: payload.studentId,
              questionId: question.questionId,
            },
          },
          create: {
            studentId: payload.studentId,
            questionId: question.questionId,
            topicId: question.topicId,
            topicName: question.topicName,
            totalAttempts: 1,
            correctAttempts: question.isCorrect ? 1 : 0,
            lastAttemptAt: occurredAt,
          },
          update: {
            totalAttempts: { increment: 1 },
            correctAttempts: { increment: question.isCorrect ? 1 : 0 },
            lastAttemptAt: occurredAt,
          },
        });
      }
    });
  }

  async recordEnrollmentCreated(studentId: string): Promise<void> {
    await this.ensureStudent(studentId);
    await this.prisma.studentLearningProfile.update({
      where: { studentId },
      data: { coursesEnrolled: { increment: 1 }, lastActivityAt: new Date() },
    });
  }

  async recordEnrollmentCompleted(studentId: string): Promise<void> {
    await this.ensureStudent(studentId);
    await this.prisma.studentLearningProfile.update({
      where: { studentId },
      data: { coursesCompleted: { increment: 1 }, lastActivityAt: new Date() },
    });
  }

  async recordLessonCompleted(
    studentId: string,
    minutes: number,
  ): Promise<void> {
    const now = new Date();
    const date = toDateOnly(now);
    await this.prisma.$transaction([
      this.prisma.studentLearningProfile.upsert({
        where: { studentId },
        create: {
          id: studentId,
          studentId,
          totalStudyMinutes: minutes,
          lastActivityAt: now,
        },
        update: {
          totalStudyMinutes: { increment: minutes },
          lastActivityAt: now,
        },
      }),
      this.prisma.dailyActivity.upsert({
        where: { studentId_date: { studentId, date } },
        create: { studentId, date, studyMinutes: minutes },
        update: { studyMinutes: { increment: minutes } },
      }),
    ]);
  }

  async resetProgress(studentId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.studentLearningProfile.upsert({
        where: { studentId },
        create: { id: studentId, studentId, resetAt: new Date() },
        update: {
          totalStudyMinutes: 0,
          coursesCompleted: 0,
          lastActivityAt: new Date(),
          resetAt: new Date(),
        },
      }),
      this.prisma.dailyActivity.deleteMany({ where: { studentId } }),
      this.prisma.questionAccuracyTracker.deleteMany({ where: { studentId } }),
    ]);
  }

  async getDashboard(studentId: string): Promise<ProgressDashboard> {
    await this.ensureStudent(studentId);
    const [profile, trendRows, weakRows] = await this.prisma.$transaction([
      this.prisma.studentLearningProfile.findUniqueOrThrow({
        where: { studentId },
      }),
      this.prisma.dailyActivity.findMany({
        where: { studentId },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      this.prisma.questionAccuracyTracker.findMany({
        where: { studentId, totalAttempts: { gt: 0 } },
        orderBy: [{ lastAttemptAt: 'desc' }],
        take: 100,
      }),
    ]);

    const passRate =
      profile.totalExamAttempts === 0
        ? 0
        : Math.round((profile.passedExams / profile.totalExamAttempts) * 100);
    const completionPct =
      profile.coursesEnrolled === 0
        ? 0
        : Math.min(
            100,
            Math.round(
              (profile.coursesCompleted / profile.coursesEnrolled) * 100,
            ),
          );

    const weakTopics = weakRows
      .map((row) => {
        const accuracyRate =
          row.totalAttempts === 0 ? 0 : row.correctAttempts / row.totalAttempts;
        return {
          topicId: row.topicId,
          topicName: row.topicName,
          incorrectCount: row.totalAttempts - row.correctAttempts,
          accuracyRate,
        };
      })
      .filter((row) => row.incorrectCount > 0)
      .sort((a, b) => b.incorrectCount - a.incorrectCount)
      .slice(0, 5);

    return {
      studentId,
      completionPct,
      studiedCount: profile.totalStudyMinutes,
      attemptCount: profile.totalExamAttempts,
      passRate,
      totalStudyMinutes: profile.totalStudyMinutes,
      avgExamScore: profile.avgExamScore,
      trend: trendRows.reverse().map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        attempts: row.examsAttempted,
        correctAnswers: row.correctAnswers,
        questionsAnswered: row.questionsAnswered,
      })),
      weakTopics,
      lastActivityAt: profile.lastActivityAt,
    };
  }
}
