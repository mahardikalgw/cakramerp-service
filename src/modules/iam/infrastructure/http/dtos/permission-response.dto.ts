import { Permission } from '../../../domain/entities/permission.entity';

export class PermissionResponseDto {
  id: string;
  name: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(permission: Permission): PermissionResponseDto {
    const dto = new PermissionResponseDto();
    dto.id = permission.id;
    dto.name = permission.name;
    dto.resource = permission.resource;
    dto.action = permission.action;
    dto.createdAt = permission.createdAt;
    dto.updatedAt = permission.updatedAt;
    return dto;
  }
}
