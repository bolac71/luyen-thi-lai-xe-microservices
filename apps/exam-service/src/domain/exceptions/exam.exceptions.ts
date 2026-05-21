import { DomainException } from '@repo/common';

export class InvalidExamTemplateException extends DomainException {
  readonly code = 'INVALID_EXAM_TEMPLATE';
}

export class ExamTemplateNotFoundException extends DomainException {
  readonly code = 'EXAM_TEMPLATE_NOT_FOUND';
  constructor(id: string) {
    super(`Cannot find exam template with id ${id}`);
  }
}

export class ExamTemplateInactiveException extends DomainException {
  readonly code = 'EXAM_TEMPLATE_INACTIVE';
  constructor(id: string) {
    super(`Exam template is inactive: ${id}`);
  }
}

export class ExamTemplateAlreadyDeletedException extends DomainException {
  readonly code = 'EXAM_TEMPLATE_ALREADY_DELETED';
  constructor(id: string) {
    super(`Exam template has already been deleted: ${id}`);
  }
}

export class ExamTemplateVersionConflictException extends DomainException {
  readonly code = 'EXAM_TEMPLATE_VERSION_CONFLICT';
  constructor(id: string) {
    super(`Version conflict in exam template: ${id}`);
  }
}

export class ExamTemplateInUseException extends DomainException {
  readonly code = 'EXAM_TEMPLATE_IN_USE';
  constructor(id: string) {
    super(`Exam template is in use by exam sessions: ${id}`);
  }
}

export class InvalidExamSessionException extends DomainException {
  readonly code = 'INVALID_EXAM_SESSION';
}

export class ExamSessionNotFoundException extends DomainException {
  readonly code = 'EXAM_SESSION_NOT_FOUND';
  constructor(id: string) {
    super(`Cannot find exam session with id ${id}`);
  }
}

export class ExamSessionQuestionNotFoundException extends DomainException {
  readonly code = 'EXAM_SESSION_QUESTION_NOT_FOUND';
  constructor(questionId: string) {
    super(`Cannot find question in exam session with id ${questionId}`);
  }
}

export class ExamSessionAlreadyFinishedException extends DomainException {
  readonly code = 'EXAM_SESSION_ALREADY_FINISHED';
  constructor(id: string) {
    super(`Exam session has already finished: ${id}`);
  }
}

export class ExamSessionExpiredException extends DomainException {
  readonly code = 'EXAM_SESSION_EXPIRED';
  constructor(id: string) {
    super(`Phiên thi đã hết hạn: ${id}`);
  }
}

export class ExamSessionNotFinishedException extends DomainException {
  readonly code = 'EXAM_SESSION_NOT_FINISHED';
  constructor(id: string) {
    super(`Phiên thi chưa kết thúc: ${id}`);
  }
}

export class ExamSessionUnauthorizedException extends DomainException {
  readonly code = 'EXAM_SESSION_UNAUTHORIZED';
  constructor(id: string) {
    super(`Không được phép truy cập phiên thi: ${id}`);
  }
}

export class StudentProfileInvalidException extends DomainException {
  readonly code = 'STUDENT_PROFILE_INVALID';
}

export class StudentLicenseMismatchException extends DomainException {
  readonly code = 'STUDENT_LICENSE_MISMATCH';
}

export class InsufficientQuestionPoolException extends DomainException {
  readonly code = 'INSUFFICIENT_QUESTION_POOL';
  constructor(required: number, actual: number) {
    super(`Ngân hàng câu hỏi chỉ có ${actual} câu, yêu cầu ${required} câu`);
  }
}
