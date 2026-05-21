export interface ProgressDashboard {
  studentId: string;
  completionPct: number;
  studiedCount: number;
  attemptCount: number;
  passRate: number;
  totalStudyMinutes: number;
  avgExamScore: number;
  trend: Array<{
    date: string;
    attempts: number;
    correctAnswers: number;
    questionsAnswered: number;
  }>;
  weakTopics: Array<{
    topicId: string | null;
    topicName: string | null;
    incorrectCount: number;
    accuracyRate: number;
  }>;
  lastActivityAt: Date | null;
}

export interface ExamCompletedPayload {
  sessionId: string;
  studentId: string;
  score: number;
  isPassed: boolean;
  occurredAt?: string;
  questions?: Array<{
    questionId: string;
    topicId?: string | null;
    topicName?: string | null;
    isCorrect?: boolean | null;
  }>;
}

export abstract class LearningProgressRepository {
  abstract ensureStudent(studentId: string): Promise<void>;
  abstract recordExamCompleted(payload: ExamCompletedPayload): Promise<void>;
  abstract recordEnrollmentCreated(studentId: string): Promise<void>;
  abstract recordEnrollmentCompleted(studentId: string): Promise<void>;
  abstract recordLessonCompleted(
    studentId: string,
    minutes: number,
  ): Promise<void>;
  abstract resetProgress(studentId: string): Promise<void>;
  abstract getDashboard(studentId: string): Promise<ProgressDashboard>;
}
