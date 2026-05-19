import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';
import { Permission } from './permission.entity';

export class Role extends BaseEntity {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;

  constructor(props: Partial<Role> & { name: string }) {
    super();
    Object.assign(this, props);
    this.permissions = props.permissions ?? [];
  }

  hasPermission(resource: string, action: string): boolean {
    return this.permissions.some(
      (p) => p.resource === resource && p.action === action,
    );
  }

  assignPermission(permission: Permission): void {
    if (!this.permissions.find((p) => p.id === permission.id)) {
      this.permissions.push(permission);
    }
  }

  removePermission(permissionId: string): void {
    this.permissions = this.permissions.filter((p) => p.id !== permissionId);
  }
}
