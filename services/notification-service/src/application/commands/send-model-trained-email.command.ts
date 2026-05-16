/** CQRS Command to send model training result email to admin. */
export class SendModelTrainedEmailCommand {
  constructor(
    public readonly email: string,
    public readonly status: string,
    public readonly version: string,
    public readonly timestamp: string,
    public readonly epochs: number,
    public readonly fineTuneRounds: number,
    public readonly totalPairs: number,
    public readonly positivePairs: number,
    public readonly finalLoss: number,
    public readonly finalAccuracy: number,
    public readonly valLoss: number,
    public readonly valAccuracy: number,
    public readonly vocabSizes: Record<string, number>,
    public readonly evalBaseline: {
      hitrateAt50: number;
      mrr: number;
      usersEvaluated: number;
    },
    public readonly evalFinal: {
      hitrateAt50: number;
      mrr: number;
      usersEvaluated: number;
    },
    public readonly reason: string,
    public readonly threshold: number,
    public readonly correlationId?: string,
  ) {}
}
