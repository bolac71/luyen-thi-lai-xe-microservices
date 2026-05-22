export class ResetEnrollmentProgressCommand {
  constructor(
    readonly enrollmentId: string,
    readonly studentId: string,
  ) {}
}
