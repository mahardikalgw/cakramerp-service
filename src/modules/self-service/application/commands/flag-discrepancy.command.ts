export class FlagDiscrepancyCommand {
  constructor(
    public readonly date: string,
    public readonly reason: string,
    public readonly correctClockIn?: string,
    public readonly correctClockOut?: string,
  ) {}
}