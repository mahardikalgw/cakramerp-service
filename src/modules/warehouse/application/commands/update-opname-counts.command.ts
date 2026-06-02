export class UpdateOpnameCountsCommand {
  constructor(public readonly lines: { itemId: string; actualQty: number }[]) {}
}
