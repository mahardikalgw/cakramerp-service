import { Role } from '../../../domain/entities/role.entity';
import { Permission } from '../../../domain/entities/permission.entity';
import { PermissionResponseDto } from './permission-response.dto';

export class RoleResponseDto {
  id: string;
  name: string;
  description: string;
  permissions: PermissionResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(role: Role): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.name = role.name;
    dto.description = role.description;
    dto.permissions = (role.permissions ?? []).map((p: Permission) =>
      PermissionResponseDto.fromDomain(p),
    );
    dto.createdAt = role.createdAt;
    dto.updatedAt = role.updatedAt;
    return dto;
  }
}
