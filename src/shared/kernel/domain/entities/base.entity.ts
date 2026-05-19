export abstract class BaseEntity {
  abstract id: string;
  abstract createdAt: Date;
  abstract updatedAt: Date;

  equals(other: BaseEntity): boolean {
    if (!(other instanceof this.constructor)) {
      return false;
    }
    return this.id === other.id;
  }
}
