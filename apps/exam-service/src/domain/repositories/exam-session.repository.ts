import { ExamSession } from '../aggregates/exam-session/exam-session.aggregate';
import { ExamSessionStatus } from '../aggregates/exam-session/exam-session.types';

export interface ListExamSessionsFilter {
  studentId?: string;
  page: number;
  size: number;
  status?: ExamSessionStatus;
  isPassed?: boolean;
  from?: Date;
  to?: Date;
}

export interface MissedQuestionItem {
  questionId: string;
  content: string;
  imageUrl: string | null;
  mediaFileId: string | null;
  options: Array<{ id: string; content: string; displayOrder: number }>;
  lastAnsweredAt: Date | null;
}

export interface ListExamSessionsPage {
  items: ExamSession[];
  total: number;
}

export abstract class ExamSessionRepository {
  abstract findById(id: string): Promise<ExamSession | null>;
  abstract findAll(
    filter: ListExamSessionsFilter,
  ): Promise<ListExamSessionsPage>;
  abstract findMissedQuestions(
    studentId: string,
    limit: number,
  ): Promise<MissedQuestionItem[]>;
  abstract save(session: ExamSession): Promise<void>;
}
