export class ChangePasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly password: string,
  ) {}
}
