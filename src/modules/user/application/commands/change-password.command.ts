export class ChangePasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly oldPassword: string,
    public readonly password: string,
  ) {}
}
