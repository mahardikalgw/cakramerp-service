export class UpdateProfileCommand {
  constructor(
    public readonly fullName?: string,
    public readonly phone?: string,
    public readonly address?: string,
    public readonly bankAccountNumber?: string,
    public readonly bankName?: string,
  ) {}
}