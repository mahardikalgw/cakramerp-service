export class UpdateSettingsCommand {
  constructor(
    public readonly settings: Record<
      string,
      { value: string; category: string }
    >,
  ) {}
}
