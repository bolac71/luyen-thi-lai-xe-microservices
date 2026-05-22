export class ListMissedQuestionsQuery {
  constructor(
    readonly studentId: string,
    readonly limit: number,
  ) {}
}
