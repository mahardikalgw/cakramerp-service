export class RunPayrollCommand {
  constructor(
    public readonly month: number,
    public readonly year: number,
  ) {}
}
