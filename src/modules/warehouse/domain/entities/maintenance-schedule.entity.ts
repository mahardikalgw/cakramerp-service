export class MaintenanceSchedule {
  constructor(
    public readonly props: {
      id?: string;
      equipmentId: string;
      intervalHours: number;
      description: string;
      lastPerformedAt?: Date;
      nextDueAt?: Date;
      createdAt?: Date;
    },
  ) {}
  get id() {
    return this.props.id;
  }
  get equipmentId() {
    return this.props.equipmentId;
  }
  get intervalHours() {
    return this.props.intervalHours;
  }
  get description() {
    return this.props.description;
  }
  get lastPerformedAt() {
    return this.props.lastPerformedAt;
  }
  get nextDueAt() {
    return this.props.nextDueAt;
  }
  get createdAt() {
    return this.props.createdAt;
  }
}
